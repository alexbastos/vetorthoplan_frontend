import "server-only"

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"

import {
  parseOAuthAuthorizationRequest,
  serializeOAuthAuthorizationRequest,
  type ValidatedOAuthAuthorizationRequest,
} from "./oauth-authorization-request"
import type { OAuthTransactionSecret } from "./environment"

const OAUTH_TRANSACTION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-Http-capta_oauth_transaction"
    : "capta_oauth_transaction"
const OAUTH_TRANSACTION_MAX_AGE_SECONDS = 10 * 60
const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/
const ENCRYPTED_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/
const TRANSACTION_VERSION = "v3"
const AES_GCM_IV_LENGTH_BYTES = 12
const AES_GCM_TAG_LENGTH_BYTES = 16
const MAX_COOKIE_VALUE_LENGTH = 3_800
const CLOCK_SKEW_SECONDS = 60
const TRANSACTION_AAD = Buffer.from(`${OAUTH_TRANSACTION_COOKIE_NAME}:${TRANSACTION_VERSION}`, "utf8")

type OAuthTransaction = Readonly<{
  authenticationPromptSatisfied: boolean
  createdAtEpochSeconds: number
  expiresAtEpochSeconds: number
  id: string
  phase: OAuthTransactionPhase
  request: ValidatedOAuthAuthorizationRequest
  subjectId?: string
}>

type OAuthTransactionPhase = "approved" | "authentication" | "authorization" | "consent"

type OAuthTransactionCookie = {
  value: string
}

type OAuthTransactionCookieOptions = {
  expires?: Date
  httpOnly: true
  maxAge: number
  path: "/"
  priority: "high"
  sameSite: "lax"
  secure: boolean
}

type OAuthTransactionCookieStore = {
  get(name: string): OAuthTransactionCookie | undefined
  set(name: string, value: string, options: OAuthTransactionCookieOptions): void
}

type OAuthTransactionOptions = {
  now?: Date
  secret: OAuthTransactionSecret
}

type ReadOAuthTransactionOptions = OAuthTransactionOptions & {
  expectedTransactionId?: string
}

type OAuthTransactionReadResult =
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "mismatched" }
  | { status: "missing" }
  | { status: "valid"; transaction: OAuthTransaction }

type OAuthTransactionPayload = {
  auth: boolean
  exp: number
  iat: number
  id: string
  phase: OAuthTransactionPhase
  query: string
  sub?: string
  version: 3
}

const OAUTH_TRANSACTION_COOKIE_OPTIONS: OAuthTransactionCookieOptions = Object.freeze({
  httpOnly: true,
  maxAge: OAUTH_TRANSACTION_MAX_AGE_SECONDS,
  path: "/",
  priority: "high",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
})

function setOAuthTransactionCookie(
  cookieStore: Pick<OAuthTransactionCookieStore, "set">,
  request: ValidatedOAuthAuthorizationRequest,
  options: OAuthTransactionOptions
): OAuthTransaction {
  const query = serializeOAuthAuthorizationRequest(request)
  const validatedRequest = parseOAuthAuthorizationRequest(query)
  const createdAtEpochSeconds = getEpochSeconds(options.now)
  const transaction: OAuthTransaction = Object.freeze({
    authenticationPromptSatisfied: false,
    createdAtEpochSeconds,
    expiresAtEpochSeconds: createdAtEpochSeconds + OAUTH_TRANSACTION_MAX_AGE_SECONDS,
    id: randomBytes(16).toString("base64url"),
    phase: "authorization",
    request: validatedRequest,
  })
  const payload: OAuthTransactionPayload = {
    auth: transaction.authenticationPromptSatisfied,
    exp: transaction.expiresAtEpochSeconds,
    iat: transaction.createdAtEpochSeconds,
    id: transaction.id,
    phase: transaction.phase,
    query,
    version: 3,
  }
  const cookieValue = encryptTransaction(payload, getEncryptionKey(options.secret))

  if (cookieValue.length > MAX_COOKIE_VALUE_LENGTH) {
    throw new Error("The OAuth transaction exceeds the safe cookie size")
  }

  cookieStore.set(OAUTH_TRANSACTION_COOKIE_NAME, cookieValue, OAUTH_TRANSACTION_COOKIE_OPTIONS)
  return transaction
}

function markOAuthTransactionConsentRequired(
  cookieStore: Pick<OAuthTransactionCookieStore, "set">,
  transaction: OAuthTransaction,
  subjectId: string,
  options: OAuthTransactionOptions
): OAuthTransaction {
  if (!isValidSubjectId(subjectId)) {
    throw new TypeError("Invalid OAuth transaction subject")
  }

  return updateOAuthTransaction(
    cookieStore,
    transaction,
    { phase: "consent", subjectId },
    options
  )
}

function markOAuthTransactionApproved(
  cookieStore: Pick<OAuthTransactionCookieStore, "set">,
  transaction: OAuthTransaction,
  options: OAuthTransactionOptions
): OAuthTransaction {
  if (!transaction.subjectId) {
    throw new Error("The OAuth transaction is not bound to an account")
  }

  return updateOAuthTransaction(cookieStore, transaction, { phase: "approved" }, options)
}

function markOAuthTransactionAuthenticationRequired(
  cookieStore: Pick<OAuthTransactionCookieStore, "set">,
  transaction: OAuthTransaction,
  options: OAuthTransactionOptions
): OAuthTransaction {
  return updateOAuthTransaction(
    cookieStore,
    transaction,
    {
      authenticationPromptSatisfied: false,
      phase: "authentication",
      subjectId: undefined,
    },
    options
  )
}

function markOAuthTransactionAuthenticationSatisfied(
  cookieStore: Pick<OAuthTransactionCookieStore, "set">,
  transaction: OAuthTransaction,
  options: OAuthTransactionOptions
): OAuthTransaction {
  if (transaction.phase !== "authentication") {
    throw new Error("The OAuth transaction is not awaiting authentication")
  }

  return updateOAuthTransaction(
    cookieStore,
    transaction,
    { authenticationPromptSatisfied: true, phase: "authorization" },
    options
  )
}

function updateOAuthTransaction(
  cookieStore: Pick<OAuthTransactionCookieStore, "set">,
  transaction: OAuthTransaction,
  updates: Partial<
    Pick<OAuthTransaction, "authenticationPromptSatisfied" | "phase" | "subjectId">
  >,
  options: OAuthTransactionOptions
): OAuthTransaction {
  const nowEpochSeconds = getEpochSeconds(options.now)

  if (nowEpochSeconds >= transaction.expiresAtEpochSeconds) {
    throw new Error("The OAuth transaction has expired")
  }

  const updatedTransaction: OAuthTransaction = Object.freeze({
    ...transaction,
    ...updates,
  })
  const query = serializeOAuthAuthorizationRequest(updatedTransaction.request)
  const payload: OAuthTransactionPayload = {
    auth: updatedTransaction.authenticationPromptSatisfied,
    exp: updatedTransaction.expiresAtEpochSeconds,
    iat: updatedTransaction.createdAtEpochSeconds,
    id: updatedTransaction.id,
    phase: updatedTransaction.phase,
    query,
    ...(updatedTransaction.subjectId === undefined ? {} : { sub: updatedTransaction.subjectId }),
    version: 3,
  }
  const cookieValue = encryptTransaction(payload, getEncryptionKey(options.secret))

  if (cookieValue.length > MAX_COOKIE_VALUE_LENGTH) {
    throw new Error("The OAuth transaction exceeds the safe cookie size")
  }

  cookieStore.set(OAUTH_TRANSACTION_COOKIE_NAME, cookieValue, {
    ...OAUTH_TRANSACTION_COOKIE_OPTIONS,
    maxAge: updatedTransaction.expiresAtEpochSeconds - nowEpochSeconds,
  })

  return updatedTransaction
}

function readOAuthTransaction(
  cookieStore: Pick<OAuthTransactionCookieStore, "get">,
  options: ReadOAuthTransactionOptions
): OAuthTransactionReadResult {
  const cookieValue = cookieStore.get(OAUTH_TRANSACTION_COOKIE_NAME)?.value

  if (!cookieValue) {
    return { status: "missing" }
  }

  const encryptionKey = getEncryptionKey(options.secret)
  let payload: OAuthTransactionPayload

  try {
    payload = decryptTransaction(cookieValue, encryptionKey)
  } catch {
    return { status: "invalid" }
  }

  const nowEpochSeconds = getEpochSeconds(options.now)

  if (
    payload.exp - payload.iat !== OAUTH_TRANSACTION_MAX_AGE_SECONDS ||
    payload.iat > nowEpochSeconds + CLOCK_SKEW_SECONDS
  ) {
    return { status: "invalid" }
  }

  if (nowEpochSeconds >= payload.exp) {
    return { status: "expired" }
  }

  if (
    options.expectedTransactionId !== undefined &&
    (!TRANSACTION_ID_PATTERN.test(options.expectedTransactionId) ||
      !constantTimeEqual(payload.id, options.expectedTransactionId))
  ) {
    return { status: "mismatched" }
  }

  try {
    const request = parseOAuthAuthorizationRequest(payload.query)

    return {
      status: "valid",
      transaction: Object.freeze({
        authenticationPromptSatisfied: payload.auth,
        createdAtEpochSeconds: payload.iat,
        expiresAtEpochSeconds: payload.exp,
        id: payload.id,
        phase: payload.phase,
        request,
        ...(payload.sub === undefined ? {} : { subjectId: payload.sub }),
      }),
    }
  } catch {
    return { status: "invalid" }
  }
}

function clearOAuthTransactionCookie(cookieStore: Pick<OAuthTransactionCookieStore, "set">): void {
  cookieStore.set(OAUTH_TRANSACTION_COOKIE_NAME, "", {
    ...OAUTH_TRANSACTION_COOKIE_OPTIONS,
    expires: new Date(0),
    maxAge: 0,
  })
}

function encryptTransaction(payload: OAuthTransactionPayload, key: Buffer): string {
  const initializationVector = randomBytes(AES_GCM_IV_LENGTH_BYTES)
  const cipher = createCipheriv("aes-256-gcm", key, initializationVector)
  cipher.setAAD(TRANSACTION_AAD)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ])
  const authenticationTag = cipher.getAuthTag()

  return [
    TRANSACTION_VERSION,
    initializationVector.toString("base64url"),
    ciphertext.toString("base64url"),
    authenticationTag.toString("base64url"),
  ].join(".")
}

function decryptTransaction(cookieValue: string, key: Buffer): OAuthTransactionPayload {
  if (cookieValue.length > MAX_COOKIE_VALUE_LENGTH) {
    throw new Error("Invalid OAuth transaction")
  }

  const segments = cookieValue.split(".")

  if (
    segments.length !== 4 ||
    segments[0] !== TRANSACTION_VERSION ||
    segments[1].length !== 16 ||
    segments[3].length !== 22 ||
    !segments.slice(1).every((segment) => ENCRYPTED_SEGMENT_PATTERN.test(segment))
  ) {
    throw new Error("Invalid OAuth transaction")
  }

  const initializationVector = Buffer.from(segments[1], "base64url")
  const ciphertext = Buffer.from(segments[2], "base64url")
  const authenticationTag = Buffer.from(segments[3], "base64url")

  if (
    initializationVector.length !== AES_GCM_IV_LENGTH_BYTES ||
    ciphertext.length === 0 ||
    authenticationTag.length !== AES_GCM_TAG_LENGTH_BYTES
  ) {
    throw new Error("Invalid OAuth transaction")
  }

  const decipher = createDecipheriv("aes-256-gcm", key, initializationVector)
  decipher.setAAD(TRANSACTION_AAD)
  decipher.setAuthTag(authenticationTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
  const payload = JSON.parse(plaintext) as unknown

  if (!isOAuthTransactionPayload(payload)) {
    throw new Error("Invalid OAuth transaction")
  }

  return payload
}

function isOAuthTransactionPayload(value: unknown): value is OAuthTransactionPayload {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(
      value,
      value.sub === undefined
        ? ["auth", "exp", "iat", "id", "phase", "query", "version"]
        : ["auth", "exp", "iat", "id", "phase", "query", "sub", "version"]
    )
  ) {
    return false
  }

  const hasValidCore =
    value.version === 3 &&
    typeof value.auth === "boolean" &&
    typeof value.id === "string" &&
    TRANSACTION_ID_PATTERN.test(value.id) &&
    (value.phase === "approved" ||
      value.phase === "authentication" ||
      value.phase === "authorization" ||
      value.phase === "consent") &&
    typeof value.query === "string" &&
    value.query.length <= 2_048 &&
    Number.isSafeInteger(value.iat) &&
    Number.isSafeInteger(value.exp) &&
    (value.iat as number) >= 0 &&
    (value.exp as number) >= 0

  if (!hasValidCore) {
    return false
  }

  if (value.phase === "consent" || value.phase === "approved") {
    return isValidSubjectId(value.sub)
  }

  return value.sub === undefined && (value.phase !== "authentication" || value.auth === false)
}

function isOAuthTransactionBoundToSubject(
  transaction: OAuthTransaction,
  subjectId: string
): boolean {
  return (
    transaction.subjectId !== undefined &&
    isValidSubjectId(subjectId) &&
    constantTimeEqual(transaction.subjectId, subjectId)
  )
}

function isValidSubjectId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256
}

function getEncryptionKey(secret: OAuthTransactionSecret): Buffer {
  const key = Buffer.from(secret, "base64url")

  if (key.length !== 32) {
    throw new Error(
      "Invalid server configuration: OAUTH_TRANSACTION_SECRET must be a 32-byte base64url value"
    )
  }

  return key
}

function getEpochSeconds(now = new Date()): number {
  const milliseconds = now.getTime()

  if (!Number.isFinite(milliseconds)) {
    throw new TypeError("Invalid OAuth transaction clock")
  }

  return Math.floor(milliseconds / 1_000)
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8")
  const rightBuffer = Buffer.from(right, "utf8")

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function hasOnlyKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const keys = Object.keys(value)

  return keys.length === expectedKeys.length && keys.every((key) => expectedKeys.includes(key))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export {
  clearOAuthTransactionCookie,
  isOAuthTransactionBoundToSubject,
  markOAuthTransactionApproved,
  markOAuthTransactionAuthenticationRequired,
  markOAuthTransactionAuthenticationSatisfied,
  markOAuthTransactionConsentRequired,
  OAUTH_TRANSACTION_COOKIE_NAME,
  OAUTH_TRANSACTION_MAX_AGE_SECONDS,
  readOAuthTransaction,
  setOAuthTransactionCookie,
}
export type {
  OAuthTransaction,
  OAuthTransactionPhase,
  OAuthTransactionCookieOptions,
  OAuthTransactionCookieStore,
  OAuthTransactionReadResult,
  ReadOAuthTransactionOptions,
}
