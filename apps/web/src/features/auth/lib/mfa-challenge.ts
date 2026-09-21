import type { MfaMethod } from "../types/auth"

const ONE_TIME_CODE_PATTERN = /^\d{6}$/
const RECOVERY_CODE_PATTERN = /^[A-Z0-9]{8}-[A-Z0-9]{8}$/

function formatMfaCode(value: string, method: MfaMethod): string {
  if (method !== "RECOVERY") {
    return value.replace(/\D/g, "").slice(0, 6)
  }

  const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)
  return characters.length > 8 ? `${characters.slice(0, 8)}-${characters.slice(8)}` : characters
}

function isValidMfaCode(value: string, method: MfaMethod): boolean {
  return method === "RECOVERY"
    ? RECOVERY_CODE_PATTERN.test(value)
    : ONE_TIME_CODE_PATTERN.test(value)
}

export { formatMfaCode, isValidMfaCode }
