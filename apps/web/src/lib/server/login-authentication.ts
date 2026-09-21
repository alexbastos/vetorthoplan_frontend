import type { MfaMethod, MfaRequiredLoginOutcome } from "@/features/auth/types/auth"

type SessionTokens = {
  accessToken: string
  refreshToken: string
}

type AuthenticatedUpstreamOutcome = {
  tokens: SessionTokens
  type: "authenticated"
}

type ParsedAuthenticationOutcome = AuthenticatedUpstreamOutcome | MfaRequiredLoginOutcome

const MFA_METHODS = new Set<MfaMethod>(["EMAIL", "RECOVERY", "TOTP"])

function parseAuthenticationOutcome(value: unknown): ParsedAuthenticationOutcome | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  if (value.type === "authenticated") {
    return isNonEmptyString(value.accessToken) && isNonEmptyString(value.refreshToken)
      ? {
          tokens: {
            accessToken: value.accessToken,
            refreshToken: value.refreshToken,
          },
          type: "authenticated",
        }
      : undefined
  }

  if (value.type !== "mfa_required" || !isNonEmptyString(value.mfaToken) || !Array.isArray(value.availableMethods)) {
    return undefined
  }

  const availableMethods = [...new Set(value.availableMethods.filter(isMfaMethod))]

  return availableMethods.length > 0
    ? {
        availableMethods,
        challengeToken: value.mfaToken,
        type: "mfa_required",
      }
    : undefined
}

function isMfaMethod(value: unknown): value is MfaMethod {
  return typeof value === "string" && MFA_METHODS.has(value as MfaMethod)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export { parseAuthenticationOutcome }
export type { ParsedAuthenticationOutcome }
