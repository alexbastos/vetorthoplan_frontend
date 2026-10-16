const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_UTF8_BYTES = 72

type PasswordPolicyStatus = {
  hasLowercase: boolean
  hasMinimumLength: boolean
  hasNoWhitespace: boolean
  hasNumber: boolean
  hasSpecialCharacter: boolean
  hasUppercase: boolean
  hasValidUtf8ByteLength: boolean
}

const utf8Encoder = new TextEncoder()

function getUtf8ByteLength(value: string) {
  return utf8Encoder.encode(value).byteLength
}

// Senhas existentes podem ser anteriores a esta política de criação.
function evaluatePasswordPolicy(password: string): PasswordPolicyStatus {
  return {
    hasLowercase: /[a-z]/.test(password),
    hasMinimumLength: password.length >= PASSWORD_MIN_LENGTH,
    hasNoWhitespace: !/\s/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialCharacter: /[^A-Za-z0-9\s]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasValidUtf8ByteLength: getUtf8ByteLength(password) <= PASSWORD_MAX_UTF8_BYTES,
  }
}

function satisfiesPasswordPolicy(password: string) {
  return Object.values(evaluatePasswordPolicy(password)).every(Boolean)
}

export { evaluatePasswordPolicy, getUtf8ByteLength, PASSWORD_MAX_UTF8_BYTES, PASSWORD_MIN_LENGTH, satisfiesPasswordPolicy }
export type { PasswordPolicyStatus }
