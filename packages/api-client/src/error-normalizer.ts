import type { HttpResult } from "./http-client"

type ApiErrorResponse = Pick<HttpResult<unknown>, "data" | "headers" | "status">

type AuthenticationErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "FORBIDDEN"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "UNAUTHORIZED"

type AuthenticationFailureReason =
  | "INVALID_TOKEN"
  | "MFA_ATTEMPTS_EXCEEDED"
  | "MFA_CODE_INVALID"
  | "MFA_METHOD_NOT_ALLOWED"
  | "MFA_NOT_ENABLED"
  | "MFA_RATE_LIMITED"
  | "MFA_SETUP_NOT_STARTED"
  | "MFA_TOKEN_EXPIRED"
  | "MFA_TOKEN_INVALID"
  | "MISSING_TOKEN"
  | "TOKEN_REVOKED"
  | "USER_INACTIVE"
  | "USER_NOT_FOUND"
  | "VALIDATION_ERROR"

type NormalizedAuthenticationError = {
  code: AuthenticationErrorCode
  reason?: AuthenticationFailureReason
  retryable: boolean
  status: 400 | 401 | 403 | 409 | 429 | 503
}

type ApiErrorLogContext = {
  upstreamCode?: string
  upstreamError?: string
  upstreamRequestId?: string
  upstreamStatus?: number
}

const BAD_REQUEST: NormalizedAuthenticationError = {
  code: "BAD_REQUEST",
  retryable: false,
  status: 400,
}

const UNAUTHORIZED: NormalizedAuthenticationError = {
  code: "UNAUTHORIZED",
  retryable: false,
  status: 401,
}

const FORBIDDEN: NormalizedAuthenticationError = {
  code: "FORBIDDEN",
  retryable: false,
  status: 403,
}

const CONFLICT: NormalizedAuthenticationError = {
  code: "CONFLICT",
  retryable: false,
  status: 409,
}

const RATE_LIMITED: NormalizedAuthenticationError = {
  code: "RATE_LIMITED",
  retryable: true,
  status: 429,
}

const SERVICE_UNAVAILABLE: NormalizedAuthenticationError = {
  code: "SERVICE_UNAVAILABLE",
  retryable: true,
  status: 503,
}

const NETWORK_ERROR: NormalizedAuthenticationError = {
  code: "NETWORK_ERROR",
  retryable: true,
  status: 503,
}

const AUTHENTICATION_FAILURE_REASONS = new Set<AuthenticationFailureReason>([
  "INVALID_TOKEN",
  "MFA_ATTEMPTS_EXCEEDED",
  "MFA_CODE_INVALID",
  "MFA_METHOD_NOT_ALLOWED",
  "MFA_NOT_ENABLED",
  "MFA_RATE_LIMITED",
  "MFA_SETUP_NOT_STARTED",
  "MFA_TOKEN_EXPIRED",
  "MFA_TOKEN_INVALID",
  "MISSING_TOKEN",
  "TOKEN_REVOKED",
  "USER_INACTIVE",
  "USER_NOT_FOUND",
  "VALIDATION_ERROR",
])

// Exclui detalhes sensíveis; o BFF ainda controla o que chega ao navegador.
function normalizeAuthenticationError(error: unknown): NormalizedAuthenticationError {
  const response = asApiErrorResponse(error)

  if (!response) {
    return NETWORK_ERROR
  }

  const reason = readAuthenticationFailureReason(asRecord(response.data)?.code)

  if (response.status === 429) {
    return withReason(RATE_LIMITED, reason)
  }

  if (response.status >= 500) {
    return withReason(SERVICE_UNAVAILABLE, reason)
  }

  if (response.status === 400) {
    return withReason(BAD_REQUEST, reason)
  }

  if (response.status === 401) {
    return withReason(UNAUTHORIZED, reason)
  }

  if (response.status === 403) {
    return withReason(FORBIDDEN, reason)
  }

  if (response.status === 409) {
    return withReason(CONFLICT, reason)
  }

  return NETWORK_ERROR
}

function withReason(
  normalized: NormalizedAuthenticationError,
  reason: AuthenticationFailureReason | undefined,
): NormalizedAuthenticationError {
  return reason ? { ...normalized, reason } : normalized
}

function readAuthenticationFailureReason(value: unknown): AuthenticationFailureReason | undefined {
  return typeof value === "string" && AUTHENTICATION_FAILURE_REASONS.has(value as AuthenticationFailureReason)
    ? value as AuthenticationFailureReason
    : undefined
}

// Metadados exclusivos de logs server-side; nunca envie ao navegador.
function getApiErrorLogContext(error: unknown): ApiErrorLogContext {
  const response = asApiErrorResponse(error)

  if (!response) {
    return {}
  }

  const body = asRecord(response.data)

  return {
    upstreamCode: readString(body?.code),
    upstreamError: readString(body?.error),
    upstreamRequestId: response.headers.get("x-request-id") ?? undefined,
    upstreamStatus: response.status,
  }
}

function asApiErrorResponse(value: unknown): ApiErrorResponse | undefined {
  const record = asRecord(value)

  if (!record || typeof record.status !== "number" || !(record.headers instanceof Headers)) {
    return undefined
  }

  return {
    data: record.data,
    headers: record.headers,
    status: record.status,
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

export { getApiErrorLogContext, normalizeAuthenticationError }
export type { ApiErrorLogContext, AuthenticationFailureReason, NormalizedAuthenticationError }
