import "server-only"

import {
  LEGACY_ACCESS_TOKEN_COOKIE_NAME,
  LEGACY_REFRESH_TOKEN_COOKIE_NAME,
  SESSION_ACCESS_COOKIE_NAME,
  SESSION_REFRESH_COOKIE_NAME,
} from "@/lib/auth-constants"

import type { SessionCookieSecrets } from "./environment"
import { openSessionToken, sealSessionToken } from "./session-cookie-codec"

const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

type SessionTokens = {
  accessToken: string
  refreshToken: string
}

type SessionCredentials = Readonly<
  Partial<SessionTokens> & {
    hasSessionCookie: boolean
    needsReissue: boolean
  }
>

type SessionCookie = {
  value: string
}

type SessionCookieOptions = {
  expires?: Date
  httpOnly: true
  maxAge: number
  path: "/"
  priority: "high"
  sameSite: "lax"
  secure: boolean
}

type SessionCookieStore = {
  get(name: string): SessionCookie | undefined
  set(name: string, value: string, options: SessionCookieOptions): void
}

type SessionCookieCryptography = {
  now?: Date
  secrets: SessionCookieSecrets
}

type OpenTokenWithRotationResult =
  | { status: "expired" }
  | { status: "invalid" }
  | { key: "current" | "previous"; status: "valid"; token: string }

const COMMON_COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  priority: "high",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const

const ACCESS_TOKEN_COOKIE_OPTIONS: SessionCookieOptions = {
  ...COMMON_COOKIE_OPTIONS,
  maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
}

const REFRESH_TOKEN_COOKIE_OPTIONS: SessionCookieOptions = {
  ...COMMON_COOKIE_OPTIONS,
  maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
}

function getSessionCredentials(
  cookieStore: Pick<SessionCookieStore, "get">,
  cryptography: SessionCookieCryptography
): SessionCredentials {
  const accessCookie = cookieStore.get(SESSION_ACCESS_COOKIE_NAME)?.value
  const refreshCookie = cookieStore.get(SESSION_REFRESH_COOKIE_NAME)?.value
  const accessResult = accessCookie
    ? openTokenWithRotation(
        accessCookie,
        SESSION_ACCESS_COOKIE_NAME,
        ACCESS_TOKEN_MAX_AGE_SECONDS,
        cryptography
      )
    : undefined
  const refreshResult = refreshCookie
    ? openTokenWithRotation(
        refreshCookie,
        SESSION_REFRESH_COOKIE_NAME,
        REFRESH_TOKEN_MAX_AGE_SECONDS,
        cryptography
      )
    : undefined

  return {
    ...(accessResult?.status === "valid" ? { accessToken: accessResult.token } : {}),
    hasSessionCookie: accessCookie !== undefined || refreshCookie !== undefined,
    needsReissue:
      (accessResult?.status === "valid" && accessResult.key === "previous") ||
      (refreshResult?.status === "valid" && refreshResult.key === "previous"),
    ...(refreshResult?.status === "valid" ? { refreshToken: refreshResult.token } : {}),
  }
}

// AADs distintos impedem a troca de finalidade entre access e refresh.
function setSessionCookies(
  cookieStore: Pick<SessionCookieStore, "set">,
  tokens: SessionTokens,
  cryptography: SessionCookieCryptography
): void {
  if (!isNonEmptyString(tokens.accessToken) || !isNonEmptyString(tokens.refreshToken)) {
    throw new Error("Session tokens must not be empty")
  }

  const key = decodeSessionCookieSecret(cryptography.secrets.current)

  cookieStore.set(
    SESSION_ACCESS_COOKIE_NAME,
    sealSessionToken(tokens.accessToken, {
      additionalAuthenticatedData: createAdditionalAuthenticatedData(
        SESSION_ACCESS_COOKIE_NAME
      ),
      key,
      maxAgeSeconds: ACCESS_TOKEN_MAX_AGE_SECONDS,
      now: cryptography.now,
    }),
    ACCESS_TOKEN_COOKIE_OPTIONS
  )
  cookieStore.set(
    SESSION_REFRESH_COOKIE_NAME,
    sealSessionToken(tokens.refreshToken, {
      additionalAuthenticatedData: createAdditionalAuthenticatedData(
        SESSION_REFRESH_COOKIE_NAME
      ),
      key,
      maxAgeSeconds: REFRESH_TOKEN_MAX_AGE_SECONDS,
      now: cryptography.now,
    }),
    REFRESH_TOKEN_COOKIE_OPTIONS
  )
  clearLegacySessionCookies(cookieStore)
}

function clearSessionCookies(cookieStore: Pick<SessionCookieStore, "set">): void {
  expireCookie(cookieStore, SESSION_ACCESS_COOKIE_NAME)
  expireCookie(cookieStore, SESSION_REFRESH_COOKIE_NAME)
  clearLegacySessionCookies(cookieStore)
}

function clearLegacySessionCookies(cookieStore: Pick<SessionCookieStore, "set">): void {
  expireCookie(cookieStore, LEGACY_ACCESS_TOKEN_COOKIE_NAME)
  expireCookie(cookieStore, LEGACY_REFRESH_TOKEN_COOKIE_NAME)
}

function expireCookie(
  cookieStore: Pick<SessionCookieStore, "set">,
  name: string
): void {
  cookieStore.set(name, "", {
    ...COMMON_COOKIE_OPTIONS,
    expires: new Date(0),
    maxAge: 0,
  })
}

function openTokenWithRotation(
  cookieValue: string,
  cookieName: string,
  maxAgeSeconds: number,
  cryptography: SessionCookieCryptography
): OpenTokenWithRotationResult {
  const additionalAuthenticatedData = createAdditionalAuthenticatedData(cookieName)
  const currentResult = openSessionToken(cookieValue, {
    additionalAuthenticatedData,
    key: decodeSessionCookieSecret(cryptography.secrets.current),
    maxAgeSeconds,
    now: cryptography.now,
  })

  if (currentResult.status !== "invalid") {
    return currentResult.status === "valid"
      ? { ...currentResult, key: "current" }
      : currentResult
  }

  if (!cryptography.secrets.previous) {
    return currentResult
  }

  const previousResult = openSessionToken(cookieValue, {
    additionalAuthenticatedData,
    key: decodeSessionCookieSecret(cryptography.secrets.previous),
    maxAgeSeconds,
    now: cryptography.now,
  })

  return previousResult.status === "valid"
    ? { ...previousResult, key: "previous" }
    : previousResult
}

function createAdditionalAuthenticatedData(cookieName: string): string {
  return `${cookieName}:vetorthoplan-session-token`
}

function decodeSessionCookieSecret(secret: string): Buffer {
  const key = Buffer.from(secret, "base64url")

  if (key.length !== 32) {
    throw new Error("Invalid session cookie encryption key")
  }

  return key
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  clearSessionCookies,
  getSessionCredentials,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  setSessionCookies,
}
export type {
  SessionCookieOptions,
  SessionCookieStore,
}
