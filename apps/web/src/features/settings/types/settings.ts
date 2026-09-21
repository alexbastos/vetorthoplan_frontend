import type { ActiveSessionsResponse, CurrentUserResponse, UploadCurrentUserAvatarResponse } from "@capta/api-client"

type AccountProfile = CurrentUserResponse["profile"]

type SettingsUser = Pick<
  CurrentUserResponse,
  "email" | "emailVerified" | "id" | "name" | "profile" | "role"
>

type AvatarUploadResult = Pick<UploadCurrentUserAvatarResponse, "avatarUrl">

type ProfileUpdateRequest = {
  address: {
    city: string | null
    country: string | null
    state: string | null
    street: string | null
    zipCode: string | null
  }
  bio: string | null
  birthDate: string | null
  locale: string | null
  name: string
  phone: string | null
  timezone: string | null
}

type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

type TotpSetupResult = {
  qrCodeUrl: string
}

type TotpSetupVerificationResult = {
  recoveryCodes: string[]
}

type TwoFactorAuthenticationStatusResult = {
  enabled: boolean
  method: "EMAIL" | "TOTP" | null
  recoveryCodesRemaining: number
}

type ActiveSession = ActiveSessionsResponse["sessions"][number]

type SettingsBffErrorCode =
  | "AUTHENTICATION_REQUEST_FAILED"
  | "MFA_CHALLENGE_INVALID"
  | "MFA_CODE_INVALID"
  | "INVALID_POSTAL_CODE"
  | "NETWORK_ERROR"
  | "POSTAL_CODE_NOT_FOUND"
  | "POSTAL_CODE_REQUEST_FAILED"
  | "POSTAL_CODE_UNAVAILABLE"
  | "RATE_LIMITED"
  | "REQUEST_NOT_ALLOWED"
  | "SERVICE_UNAVAILABLE"
  | "SESSION_UNAVAILABLE"
  | "SETTINGS_REQUEST_FAILED"
  | "VALIDATION_ERROR"

type SettingsBffError = {
  code: SettingsBffErrorCode
  retryable: boolean
}

type SettingsBffResult<Data> =
  | { data: Data; ok: true; status: number }
  | { error: SettingsBffError; ok: false; status: number }

export type { AccountProfile, ActiveSession, AvatarUploadResult, ChangePasswordInput, ProfileUpdateRequest, SettingsBffError, SettingsBffErrorCode, SettingsBffResult, SettingsUser, TotpSetupResult, TotpSetupVerificationResult, TwoFactorAuthenticationStatusResult }
