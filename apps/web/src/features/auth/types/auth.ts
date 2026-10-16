type AuthBffErrorCode =
  | "ACCOUNT_REQUIRES_ACTION"
  | "AUTHENTICATION_REQUEST_FAILED"
  | "INVALID_CREDENTIALS"
  | "INVALID_RECOVERY_LINK"
  | "INVALID_VERIFICATION_LINK"
  | "MFA_ATTEMPTS_EXCEEDED"
  | "MFA_CHALLENGE_EXPIRED"
  | "MFA_CHALLENGE_INVALID"
  | "MFA_CODE_INVALID"
  | "MFA_METHOD_NOT_ALLOWED"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "REGISTRATION_CONFLICT"
  | "REQUEST_NOT_ALLOWED"
  | "SERVICE_UNAVAILABLE"
  | "SESSION_UNAVAILABLE"
  | "SOCIAL_AUTH_FAILED"
  | "VALIDATION_ERROR"

type AuthBffError = {
  code: AuthBffErrorCode
  retryable: boolean
}

type AuthBffFailure = {
  error: AuthBffError
  ok: false
  status: number
}

type AuthBffSuccess<Data> = {
  data: Data
  ok: true
  status: number
}

type AuthBffResult<Data> = AuthBffFailure | AuthBffSuccess<Data>

type MfaMethod = "EMAIL" | "RECOVERY" | "TOTP"

type AuthenticatedLoginOutcome = {
  type: "authenticated"
}

type MfaRequiredLoginOutcome = {
  availableMethods: MfaMethod[]
  challengeToken: string
  type: "mfa_required"
}

type LoginOutcome = AuthenticatedLoginOutcome | MfaRequiredLoginOutcome

type AuthenticatedUser = {
  email: string
  emailVerified: boolean
  id: string
  name: string
  role: "ADMIN" | "USER"
}

type AuthenticatedSession = {
  accessTokenExpiresAt: string | null
  authenticated: true
  user: AuthenticatedUser
}

type AnonymousSession = {
  authenticated: false
}

type PublicSession = AnonymousSession | AuthenticatedSession

export type {
  AnonymousSession,
  AuthBffError,
  AuthBffErrorCode,
  AuthBffFailure,
  AuthBffResult,
  AuthBffSuccess,
  AuthenticatedSession,
  AuthenticatedUser,
  LoginOutcome,
  MfaMethod,
  MfaRequiredLoginOutcome,
  PublicSession,
}
