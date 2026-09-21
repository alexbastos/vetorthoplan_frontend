import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto"

const SEALED_SESSION_TOKEN_VERSION = "v1"
const AES_GCM_IV_LENGTH_BYTES = 12
const AES_GCM_TAG_LENGTH_BYTES = 16
const AES_256_KEY_LENGTH_BYTES = 32
const CLOCK_SKEW_SECONDS = 60
const MAX_COOKIE_VALUE_LENGTH = 3_800
const ENCODED_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/

type SessionTokenCodecOptions = {
  additionalAuthenticatedData: string
  key: Uint8Array
  maxAgeSeconds: number
  now?: Date
}

type OpenSessionTokenResult =
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "valid"; token: string }

type SealedSessionTokenPayload = {
  exp: number
  iat: number
  token: string
  version: 1
}

function sealSessionToken(token: string, options: SessionTokenCodecOptions): string {
  assertCodecOptions(options)

  if (!isNonEmptyString(token)) {
    throw new TypeError("Session token must not be empty")
  }

  const issuedAtEpochSeconds = getEpochSeconds(options.now)
  const payload: SealedSessionTokenPayload = {
    exp: issuedAtEpochSeconds + options.maxAgeSeconds,
    iat: issuedAtEpochSeconds,
    token,
    version: 1,
  }
  const initializationVector = randomBytes(AES_GCM_IV_LENGTH_BYTES)
  const cipher = createCipheriv("aes-256-gcm", options.key, initializationVector)
  cipher.setAAD(Buffer.from(options.additionalAuthenticatedData, "utf8"))
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ])
  const authenticationTag = cipher.getAuthTag()
  const cookieValue = [
    SEALED_SESSION_TOKEN_VERSION,
    initializationVector.toString("base64url"),
    ciphertext.toString("base64url"),
    authenticationTag.toString("base64url"),
  ].join(".")

  if (cookieValue.length > MAX_COOKIE_VALUE_LENGTH) {
    throw new Error("The encrypted session token exceeds the safe cookie size")
  }

  return cookieValue
}

function openSessionToken(
  cookieValue: string,
  options: SessionTokenCodecOptions
): OpenSessionTokenResult {
  try {
    assertCodecOptions(options)

    if (cookieValue.length > MAX_COOKIE_VALUE_LENGTH) {
      return { status: "invalid" }
    }

    const segments = cookieValue.split(".")

    if (
      segments.length !== 4 ||
      segments[0] !== SEALED_SESSION_TOKEN_VERSION ||
      segments[1].length !== 16 ||
      segments[3].length !== 22 ||
      !segments.slice(1).every(isCanonicalBase64Url)
    ) {
      return { status: "invalid" }
    }

    const initializationVector = Buffer.from(segments[1], "base64url")
    const ciphertext = Buffer.from(segments[2], "base64url")
    const authenticationTag = Buffer.from(segments[3], "base64url")

    if (
      initializationVector.length !== AES_GCM_IV_LENGTH_BYTES ||
      ciphertext.length === 0 ||
      authenticationTag.length !== AES_GCM_TAG_LENGTH_BYTES
    ) {
      return { status: "invalid" }
    }

    const decipher = createDecipheriv("aes-256-gcm", options.key, initializationVector)
    decipher.setAAD(Buffer.from(options.additionalAuthenticatedData, "utf8"))
    decipher.setAuthTag(authenticationTag)
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8")
    const payload = JSON.parse(plaintext) as unknown

    if (!isSealedSessionTokenPayload(payload, options.maxAgeSeconds)) {
      return { status: "invalid" }
    }

    const nowEpochSeconds = getEpochSeconds(options.now)

    if (payload.iat > nowEpochSeconds + CLOCK_SKEW_SECONDS) {
      return { status: "invalid" }
    }

    return nowEpochSeconds >= payload.exp
      ? { status: "expired" }
      : { status: "valid", token: payload.token }
  } catch {
    return { status: "invalid" }
  }
}

function isSealedSessionTokenPayload(
  value: unknown,
  maxAgeSeconds: number
): value is SealedSessionTokenPayload {
  if (!isRecord(value) || !hasOnlyKeys(value, ["exp", "iat", "token", "version"])) {
    return false
  }

  return (
    value.version === 1 &&
    isNonEmptyString(value.token) &&
    Number.isSafeInteger(value.iat) &&
    Number.isSafeInteger(value.exp) &&
    (value.iat as number) >= 0 &&
    (value.exp as number) - (value.iat as number) === maxAgeSeconds
  )
}

function assertCodecOptions(options: SessionTokenCodecOptions): void {
  if (
    options.key.byteLength !== AES_256_KEY_LENGTH_BYTES ||
    !isNonEmptyString(options.additionalAuthenticatedData) ||
    !Number.isSafeInteger(options.maxAgeSeconds) ||
    options.maxAgeSeconds <= 0
  ) {
    throw new TypeError("Invalid session token codec configuration")
  }
}

function getEpochSeconds(now = new Date()): number {
  const milliseconds = now.getTime()

  if (!Number.isFinite(milliseconds)) {
    throw new TypeError("Invalid session token clock")
  }

  return Math.floor(milliseconds / 1_000)
}

function hasOnlyKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const keys = Object.keys(value)

  return keys.length === expectedKeys.length && keys.every((key) => expectedKeys.includes(key))
}

function isCanonicalBase64Url(value: string): boolean {
  return (
    ENCODED_SEGMENT_PATTERN.test(value) &&
    Buffer.from(value, "base64url").toString("base64url") === value
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export { openSessionToken, sealSessionToken }
export type { OpenSessionTokenResult, SessionTokenCodecOptions }
