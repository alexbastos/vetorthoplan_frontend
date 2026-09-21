import "server-only"

const DEFAULT_POST_AUTH_REDIRECT = "/app"
const INTERNAL_URL_BASE = "http://vetorthoplan.internal"
const TRUSTED_FETCH_SITE = "same-origin"
const UNTRUSTED_FETCH_SITES = new Set(["cross-site", "none", "same-site"])

type MutationRequestBody =
  | "application/json"
  | "application/x-www-form-urlencoded"
  | "multipart/form-data"
  | "none"

type MutationRequestMethod = "DELETE" | "PATCH" | "POST" | "PUT"

type MutationRequestPolicy = Readonly<{
  body: MutationRequestBody
  method: MutationRequestMethod
}>

type RequestSecurityErrorReason =
  | "body_not_allowed"
  | "content_encoding_not_allowed"
  | "content_length_invalid"
  | "content_type_not_allowed"
  | "method_not_allowed"
  | "navigation_not_allowed"
  | "origin_not_trusted"
  | "payload_too_large"

type RequestSecurityErrorStatus = 400 | 403 | 405 | 413 | 415

class RequestSecurityError extends Error {
  readonly reason: RequestSecurityErrorReason
  readonly status: RequestSecurityErrorStatus

  constructor(reason: RequestSecurityErrorReason, status: RequestSecurityErrorStatus) {
    super("The request does not satisfy the security policy")
    this.name = "RequestSecurityError"
    this.reason = reason
    this.status = status
  }
}

function assertDocumentNavigationRequest(
  request: Pick<Request, "headers" | "method">
): void {
  if (request.method !== "GET") {
    throw new RequestSecurityError("method_not_allowed", 405)
  }

  const fetchMode = request.headers.get("sec-fetch-mode")?.trim().toLowerCase()
  const fetchDestination = request.headers.get("sec-fetch-dest")?.trim().toLowerCase()

  if (
    (fetchMode !== undefined && fetchMode !== "navigate") ||
    (fetchDestination !== undefined && fetchDestination !== "document")
  ) {
    throw new RequestSecurityError("navigation_not_allowed", 403)
  }
}

async function assertTrustedMutationRequest(
  request: Pick<Request, "body" | "headers" | "method">,
  expectedOrigin: string,
  policy: MutationRequestPolicy
): Promise<void> {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase()

  if (
    request.headers.get("origin") !== expectedOrigin ||
    (fetchSite !== undefined &&
      fetchSite !== TRUSTED_FETCH_SITE &&
      UNTRUSTED_FETCH_SITES.has(fetchSite))
  ) {
    throw new RequestSecurityError("origin_not_trusted", 403)
  }

  if (request.method !== policy.method) {
    throw new RequestSecurityError("method_not_allowed", 405)
  }

  const contentEncoding = request.headers.get("content-encoding")

  if (contentEncoding && contentEncoding.trim().toLowerCase() !== "identity") {
    throw new RequestSecurityError("content_encoding_not_allowed", 415)
  }

  const contentType = getRequestMediaType(request.headers.get("content-type"))

  if (policy.body === "none") {
    if (contentType !== undefined) {
      throw new RequestSecurityError("content_type_not_allowed", 415)
    }

    const declaredLength = readDeclaredContentLength(request.headers)

    if (declaredLength !== undefined && declaredLength !== 0) {
      throw new RequestSecurityError("body_not_allowed", 400)
    }

    await assertEmptyRequestBody(request.body)
    return
  }

  if (contentType !== policy.body) {
    throw new RequestSecurityError("content_type_not_allowed", 415)
  }
}

async function assertEmptyRequestBody(body: ReadableStream<Uint8Array> | null): Promise<void> {
  if (!body) {
    return
  }

  const reader = body.getReader()

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      return
    }

    if (value.byteLength > 0) {
      try {
        await reader.cancel()
      } catch {}

      throw new RequestSecurityError("body_not_allowed", 400)
    }
  }
}

async function readBoundedRequestBody(
  request: Pick<Request, "body" | "headers">,
  maxBytes: number
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError("maxBytes must be a positive safe integer")
  }

  const declaredLength = readDeclaredContentLength(request.headers)

  if (declaredLength !== undefined && declaredLength > maxBytes) {
    throw new RequestSecurityError("payload_too_large", 413)
  }

  if (!request.body) {
    return new Uint8Array()
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let receivedBytes = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      return concatenateChunks(chunks, receivedBytes)
    }

    receivedBytes += value.byteLength

    if (receivedBytes > maxBytes) {
      try {
        await reader.cancel()
      } catch {}

      throw new RequestSecurityError("payload_too_large", 413)
    }

    chunks.push(value)
  }
}

function getSafeInternalRedirect(
  destination: string | null | undefined,
  fallback = DEFAULT_POST_AUTH_REDIRECT
): string {
  const decodedDestination = decodeDestination(destination)

  if (
    !destination ||
    !decodedDestination ||
    !destination.startsWith("/") ||
    decodedDestination.startsWith("//") ||
    /[\\\u0000-\u001F]/.test(decodedDestination)
  ) {
    return fallback
  }

  const parsedDestination = new URL(destination, INTERNAL_URL_BASE)

  if (parsedDestination.origin !== INTERNAL_URL_BASE) {
    return fallback
  }

  return `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`
}

function decodeDestination(destination: string | null | undefined): string | undefined {
  if (!destination) {
    return undefined
  }

  try {
    return decodeURIComponent(destination)
  } catch {
    return undefined
  }
}

function getRequestMediaType(contentType: string | null): string | undefined {
  const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase()
  return mediaType || undefined
}

function readDeclaredContentLength(headers: Headers): number | undefined {
  const value = headers.get("content-length")

  if (value === null) {
    return undefined
  }

  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new RequestSecurityError("content_length_invalid", 400)
  }

  const contentLength = Number(value)

  if (!Number.isSafeInteger(contentLength)) {
    throw new RequestSecurityError("content_length_invalid", 400)
  }

  return contentLength
}

function concatenateChunks(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const body = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return body
}

export {
  assertDocumentNavigationRequest,
  assertTrustedMutationRequest,
  DEFAULT_POST_AUTH_REDIRECT,
  getSafeInternalRedirect,
  readBoundedRequestBody,
  RequestSecurityError,
}
export type { MutationRequestBody, MutationRequestPolicy }
