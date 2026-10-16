import "server-only"

import { createHash } from "node:crypto"
import type { AuthenticationApiClient, CurrentUserResponse } from "@capta/api-client"

import { createAuthenticationApiClient } from "./authentication-api"
import { logAuthenticationFailure, logUnexpectedAuthenticationFailure } from "./auth-bff-route"
import {
  getSessionServerEnvironment,
  type SessionCookieSecrets,
} from "./environment"
import { clearSessionCookies, getSessionCredentials, setSessionCookies, type SessionCookieStore } from "./session-cookies"

type SessionCookieReader = Pick<SessionCookieStore, "get">
type SessionCookieWriter = Pick<SessionCookieStore, "set">

type AuthenticatedServerSession = {
  accessToken: string
  accessTokenExpiresAt: string | null
  refreshed: boolean
  state: "authenticated"
  user: CurrentUserResponse
}

type AnonymousServerSession = {
  reason: "access-rejected" | "missing" | "refresh-failed" | "revoked"
  state: "anonymous"
}

type RefreshRequiredServerSession = {
  state: "refresh-required"
}

type UnavailableServerSession = {
  state: "unavailable"
}

type ServerSession =
  | AnonymousServerSession
  | AuthenticatedServerSession
  | RefreshRequiredServerSession
  | UnavailableServerSession

type ResolveServerSessionOptions = {
  client?: AuthenticationApiClient
  cookieReader: SessionCookieReader
  cookieWriter?: SessionCookieWriter
  sessionCookieSecrets?: SessionCookieSecrets
}

type RevokeCurrentServerSessionOptions = {
  client?: AuthenticationApiClient
  cookieReader: SessionCookieReader
  sessionCookieSecrets?: SessionCookieSecrets
}

type RefreshedTokens = {
  accessToken: string
  refreshToken: string
}

type RefreshHttpResult = Awaited<ReturnType<AuthenticationApiClient["refresh"]>>

type RefreshAttempt =
  | { kind: "invalid-response" }
  | { kind: "refreshed"; tokens: RefreshedTokens }
  | { kind: "rejected" }
  | { kind: "unavailable" }

const REFRESH_RESULT_GRACE_MS = 5_000
// A chave nunca retém a credencial e a deduplicação é local ao processo.
const refreshAttempts = new Map<string, Promise<RefreshAttempt>>()

// Tokens rotacionados só para revogação não são persistidos.
async function revokeCurrentServerSession({
  client = createAuthenticationApiClient(),
  cookieReader,
  sessionCookieSecrets = getSessionServerEnvironment().sessionCookieSecrets,
}: RevokeCurrentServerSessionOptions): Promise<void> {
  const { accessToken, refreshToken } = getSessionCredentials(cookieReader, {
    secrets: sessionCookieSecrets,
  })

  if (accessToken) {
    const logoutResult = await revokeWithAccessToken(client, accessToken)

    if (logoutResult !== "unauthorized") {
      return
    }
  }

  if (!refreshToken) {
    return
  }

  const refreshAttempt = await getOrCreateRefreshAttempt(client, refreshToken)

  if (refreshAttempt.kind === "refreshed") {
    await revokeWithAccessToken(client, refreshAttempt.tokens.accessToken)
  }
}

async function revokeWithAccessToken(
  client: AuthenticationApiClient,
  accessToken: string,
): Promise<"revoked" | "unauthorized" | "unavailable"> {
  try {
    const logoutResponse = await client.logout({ accessToken })

    if (logoutResponse.status === 204) {
      return "revoked"
    }

    logAuthenticationFailure("logout", logoutResponse)
    return logoutResponse.status === 401 ? "unauthorized" : "unavailable"
  } catch (error) {
    logUnexpectedAuthenticationFailure("logout", error)
    return "unavailable"
  }
}

// Nunca rotacione refresh token sem um destino para persistir os novos cookies.
async function resolveServerSession({
  client = createAuthenticationApiClient(),
  cookieReader,
  cookieWriter,
  sessionCookieSecrets = getSessionServerEnvironment().sessionCookieSecrets,
}: ResolveServerSessionOptions): Promise<ServerSession> {
  const credentials = getSessionCredentials(cookieReader, {
    secrets: sessionCookieSecrets,
  })
  const { accessToken, refreshToken } = credentials

  if (!accessToken) {
    if (!refreshToken) {
      if (credentials.hasSessionCookie && cookieWriter) {
        clearSessionCookies(cookieWriter)
      }

      return { reason: "missing", state: "anonymous" }
    }

    if (!cookieWriter) {
      return { state: "refresh-required" }
    }

    return await refreshAndRetryProfile(
      client,
      cookieWriter,
      refreshToken,
      sessionCookieSecrets
    )
  }

  try {
    const profileResponse = await client.getCurrentUser({ accessToken })

    if (profileResponse.status === 200 && isCurrentUserResponse(profileResponse.data)) {
      if (cookieWriter && refreshToken && credentials.needsReissue) {
        setSessionCookies(
          cookieWriter,
          { accessToken, refreshToken },
          { secrets: sessionCookieSecrets }
        )
      }

      return createAuthenticatedSession(profileResponse.data, accessToken, false)
    }

    if (profileResponse.status !== 401) {
      logAuthenticationFailure("session", profileResponse)
      return { state: "unavailable" }
    }

    if (!refreshToken) {
      if (cookieWriter) {
        clearSessionCookies(cookieWriter)
      }

      return { reason: "access-rejected", state: "anonymous" }
    }

    if (!cookieWriter) {
      return { state: "refresh-required" }
    }

    return await refreshAndRetryProfile(
      client,
      cookieWriter,
      refreshToken,
      sessionCookieSecrets
    )
  } catch (error) {
    logUnexpectedAuthenticationFailure("session", error)
    return { state: "unavailable" }
  }
}

async function refreshAndRetryProfile(
  client: AuthenticationApiClient,
  cookieWriter: SessionCookieWriter,
  refreshToken: string,
  sessionCookieSecrets: SessionCookieSecrets
): Promise<ServerSession> {
  const attempt = await getOrCreateRefreshAttempt(client, refreshToken)

  if (attempt.kind === "rejected") {
    clearSessionCookies(cookieWriter)
    return { reason: "refresh-failed", state: "anonymous" }
  }

  if (attempt.kind === "invalid-response") {
    clearSessionCookies(cookieWriter)
    return { state: "unavailable" }
  }

  if (attempt.kind === "unavailable") {
    return { state: "unavailable" }
  }

  try {
    const retryProfileResponse = await client.getCurrentUser({ accessToken: attempt.tokens.accessToken })

    if (retryProfileResponse.status === 200 && isCurrentUserResponse(retryProfileResponse.data)) {
      setSessionCookies(cookieWriter, attempt.tokens, { secrets: sessionCookieSecrets })
      return createAuthenticatedSession(retryProfileResponse.data, attempt.tokens.accessToken, true)
    }

    logAuthenticationFailure("session", retryProfileResponse)

    if (retryProfileResponse.status === 401) {
      clearSessionCookies(cookieWriter)
      return { reason: "revoked", state: "anonymous" }
    }

    setSessionCookies(cookieWriter, attempt.tokens, { secrets: sessionCookieSecrets })
    return { state: "unavailable" }
  } catch (error) {
    logUnexpectedAuthenticationFailure("session", error)
    setSessionCookies(cookieWriter, attempt.tokens, { secrets: sessionCookieSecrets })
    return { state: "unavailable" }
  }
}

// Evita reutilizar o mesmo refresh token em requisições paralelas.
function getOrCreateRefreshAttempt(
  client: AuthenticationApiClient,
  refreshToken: string,
): Promise<RefreshAttempt> {
  const key = createHash("sha256").update(refreshToken).digest("base64url")
  const activeAttempt = refreshAttempts.get(key)

  if (activeAttempt) {
    return activeAttempt
  }

  const attempt = performRefreshAttempt(client, refreshToken)
  refreshAttempts.set(key, attempt)

  void attempt.then(
    () => {
      const cleanup = setTimeout(() => deleteRefreshAttempt(key, attempt), REFRESH_RESULT_GRACE_MS)
      cleanup.unref()
    },
    () => deleteRefreshAttempt(key, attempt),
  )

  return attempt
}

function deleteRefreshAttempt(key: string, attempt: Promise<RefreshAttempt>): void {
  if (refreshAttempts.get(key) === attempt) {
    refreshAttempts.delete(key)
  }
}

async function performRefreshAttempt(
  client: AuthenticationApiClient,
  refreshToken: string,
): Promise<RefreshAttempt> {
  let refreshResponse: RefreshHttpResult

  try {
    refreshResponse = await client.refresh({ refreshToken })
  } catch (error) {
    logUnexpectedAuthenticationFailure("session", error)
    return { kind: "unavailable" }
  }

  if (refreshResponse.status !== 200) {
    logAuthenticationFailure("session", refreshResponse)

    return refreshResponse.status === 401 ? { kind: "rejected" } : { kind: "unavailable" }
  }

  const refreshedTokens = getRefreshedTokens(refreshResponse.data)

  if (!refreshedTokens) {
    logAuthenticationFailure("session", refreshResponse)
    return { kind: "invalid-response" }
  }

  return { kind: "refreshed", tokens: refreshedTokens }
}

function getRefreshedTokens(value: unknown): RefreshedTokens | undefined {
  if (!isRecord(value) || !isNonEmptyString(value.accessToken) || !isNonEmptyString(value.refreshToken)) {
    return undefined
  }

  return { accessToken: value.accessToken, refreshToken: value.refreshToken }
}

function createAuthenticatedSession(
  user: CurrentUserResponse,
  accessToken: string,
  refreshed: boolean
): AuthenticatedServerSession {
  return {
    accessToken,
    accessTokenExpiresAt: getApproximateAccessTokenExpiry(accessToken),
    refreshed,
    state: "authenticated",
    user,
  }
}

// Esta leitura informa a UI; a validação do token pertence ao backend.
function getApproximateAccessTokenExpiry(accessToken: string): string | null {
  const segments = accessToken.split(".")

  if (segments.length !== 3 || segments[1].length > 4096) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"))

    if (!isRecord(payload) || typeof payload.exp !== "number" || !Number.isSafeInteger(payload.exp)) {
      return null
    }

    const expiresAt = new Date(payload.exp * 1000)
    return Number.isNaN(expiresAt.getTime()) ? null : expiresAt.toISOString()
  } catch {
    return null
  }
}

function isCurrentUserResponse(value: unknown): value is CurrentUserResponse {
  if (!isRecord(value)) {
    return false
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.email) &&
    (value.role === "USER" || value.role === "ADMIN") &&
    (value.status === "ACTIVE" || value.status === "INACTIVE") &&
    typeof value.emailVerified === "boolean" &&
    Array.isArray(value.socialProviders) &&
    value.socialProviders.every(isNonEmptyString) &&
    isProfile(value.profile) &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt)
  )
}

function isProfile(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.address)) {
    return false
  }

  return (
    isNullableString(value.avatarUrl) &&
    isNullableString(value.phone) &&
    isNullableString(value.birthDate) &&
    isNullableString(value.bio) &&
    isNullableString(value.locale) &&
    isNullableString(value.timezone) &&
    isNullableString(value.address.street) &&
    isNullableString(value.address.city) &&
    isNullableString(value.address.state) &&
    isNullableString(value.address.zipCode) &&
    isNullableString(value.address.country)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

export { resolveServerSession, revokeCurrentServerSession }
export type {
  AnonymousServerSession,
  AuthenticatedServerSession,
  RefreshRequiredServerSession,
  ResolveServerSessionOptions,
  ServerSession,
  UnavailableServerSession,
}
