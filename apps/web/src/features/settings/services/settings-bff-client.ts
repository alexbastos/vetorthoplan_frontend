import type { ActiveSession, AvatarUploadResult, ChangePasswordInput, ProfileUpdateRequest, SettingsBffError, SettingsBffErrorCode, SettingsBffResult, SettingsUser, TotpSetupResult, TotpSetupVerificationResult, TwoFactorAuthenticationStatusResult } from "../types/settings"
import { parseActiveSessionsResponse } from "../schemas/active-sessions-response.schema"

const SETTINGS_ERROR_CODES = new Set<SettingsBffErrorCode>([
  "AUTHENTICATION_REQUEST_FAILED",
  "MFA_CHALLENGE_INVALID",
  "MFA_CODE_INVALID",
  "NETWORK_ERROR",
  "RATE_LIMITED",
  "REQUEST_NOT_ALLOWED",
  "SERVICE_UNAVAILABLE",
  "SESSION_UNAVAILABLE",
  "SETTINGS_REQUEST_FAILED",
  "VALIDATION_ERROR",
])

const GENERIC_ERROR: SettingsBffError = {
  code: "SETTINGS_REQUEST_FAILED",
  retryable: false,
}

const INVALID_RESPONSE_ERROR: SettingsBffError = {
  code: "SERVICE_UNAVAILABLE",
  retryable: true,
}

const SETTINGS_REQUEST_TIMEOUT_MS = 15_000

const settingsBffClient = {
  beginTotpSetup: () => request<TotpSetupResult>("/api/settings/two-factor-authentication/setup", "POST"),
  getTwoFactorAuthenticationStatus: () => request<TwoFactorAuthenticationStatusResult>("/api/settings/two-factor-authentication/status", "POST"),
  verifyTotpSetup: (code: string) => request<TotpSetupVerificationResult>("/api/settings/two-factor-authentication/verify-setup", "POST", { code }),
  changePassword: (input: ChangePasswordInput) => request<undefined>("/api/settings/password", "PUT", input),
  deleteAvatar: () => request<{ avatarUrl: null }>("/api/settings/avatar", "DELETE"),
  getActiveSessions,
  getProfile: () => request<{ user: SettingsUser }>("/api/settings/profile", "POST"),
  revokeActiveSession: (sessionId: string) => request<undefined>(`/api/settings/sessions/${encodeURIComponent(sessionId)}`, "DELETE"),
  updateProfile: (input: ProfileUpdateRequest) => request<{ user: SettingsUser }>("/api/settings/profile", "PUT", input),
  uploadAvatar: (avatar: File) => {
    const body = new FormData()
    body.append("avatar", avatar)
    return request<AvatarUploadResult>("/api/settings/avatar", "POST", body)
  },
}

async function getActiveSessions(): Promise<SettingsBffResult<{ sessions: ActiveSession[] }>> {
  const result = await request<unknown>("/api/settings/sessions", "POST")

  if (!result.ok) {
    return result
  }

  const activeSessions = parseActiveSessionsResponse(result.data)

  if (!activeSessions) {
    return { error: INVALID_RESPONSE_ERROR, ok: false, status: 503 }
  }

  return { data: activeSessions, ok: true, status: result.status }
}

async function request<Data>(path: string, method: "DELETE" | "POST" | "PUT", body?: FormData | object): Promise<SettingsBffResult<Data>> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), SETTINGS_REQUEST_TIMEOUT_MS)

  try {
    const isFormData = body instanceof FormData
    const response = await fetch(path, {
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
      headers: body === undefined || isFormData ? undefined : { "content-type": "application/json" },
      method,
      signal: controller.signal,
    })
    const payload = await readJson(response)

    if (!response.ok) {
      return { error: getPublicError(payload), ok: false, status: response.status }
    }

    return { data: payload as Data, ok: true, status: response.status }
  } catch {
    return {
      error: { code: "NETWORK_ERROR", retryable: true },
      ok: false,
      status: 503,
    }
  } finally {
    window.clearTimeout(timeout)
  }
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    return undefined
  }

  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function getPublicError(payload: unknown): SettingsBffError {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return GENERIC_ERROR
  }

  const { code, retryable } = payload.error
  return isSettingsErrorCode(code) && typeof retryable === "boolean"
    ? { code, retryable }
    : GENERIC_ERROR
}

function isSettingsErrorCode(value: unknown): value is SettingsBffErrorCode {
  return typeof value === "string" && SETTINGS_ERROR_CODES.has(value as SettingsBffErrorCode)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export { settingsBffClient }
