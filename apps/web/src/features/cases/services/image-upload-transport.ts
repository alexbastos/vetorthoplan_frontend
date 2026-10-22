import type { ImageUploadSession } from "../types/image-upload-session"
import { isUploadSignatureExpired } from "../lib/upload-signature-expiry"

type TransportErrorCode = "EXPIRED" | "NETWORK_AMBIGUOUS" | "STORAGE_REJECTED" | "STORAGE_UNAVAILABLE"

class ImageUploadTransportError extends Error {
  readonly code: TransportErrorCode

  constructor(code: TransportErrorCode) {
    super(code)
    this.name = "ImageUploadTransportError"
    this.code = code
  }
}

async function transportImageUpload(
  session: ImageUploadSession,
  file: File,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch; onProgress?: (percent: number) => void;
    xhrFactory?: () => XMLHttpRequest } = {},
): Promise<void> {
  if (isUploadSignatureExpired(session.upload.expiresAt)) throw new ImageUploadTransportError("EXPIRED")
  if (file.size !== session.sizeBytes) throw new ImageUploadTransportError("STORAGE_REJECTED")

  const body = new FormData()
  for (const [name, value] of Object.entries(session.upload.fields)) body.append(name, value)
  body.append("file", file, file.name)

  if (options.onProgress && !options.fetchImpl) {
    return transportWithProgress(session, body, options)
  }

  let response: Response
  try {
    response = await (options.fetchImpl ?? fetch)(session.upload.url, {
      method: session.upload.method,
      body,
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ImageUploadTransportError("NETWORK_AMBIGUOUS")
  }
  if (response.ok) return
  if (response.status === 403 || response.status === 400) throw new ImageUploadTransportError("STORAGE_REJECTED")
  throw new ImageUploadTransportError("STORAGE_UNAVAILABLE")
}

function transportWithProgress(
  session: ImageUploadSession,
  body: FormData,
  options: { signal?: AbortSignal; onProgress?: (percent: number) => void;
    xhrFactory?: () => XMLHttpRequest },
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const request = options.xhrFactory?.() ?? new XMLHttpRequest()
    let reportedProgress = 0
    const cleanup = () => options.signal?.removeEventListener("abort", abort)
    const abort = () => request.abort()
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        // Sending the final byte is different from the storage accepting the POST.
        const percent = Math.max(reportedProgress, Math.min(99, Math.floor(event.loaded / event.total * 100)))
        if (percent !== reportedProgress) {
          reportedProgress = percent
          options.onProgress?.(percent)
        }
      }
    })
    request.addEventListener("load", () => {
      cleanup()
      if (request.status >= 200 && request.status < 300) {
        options.onProgress?.(100)
        resolve()
      }
      else reject(new ImageUploadTransportError(request.status === 400 || request.status === 403
        ? "STORAGE_REJECTED" : "STORAGE_UNAVAILABLE"))
    })
    request.addEventListener("error", () => { cleanup(); reject(new ImageUploadTransportError("NETWORK_AMBIGUOUS")) })
    request.addEventListener("abort", () => {
      cleanup()
      reject(new DOMException("Aborted", "AbortError"))
    })
    options.signal?.addEventListener("abort", abort, { once: true })
    try {
      request.open(session.upload.method, session.upload.url)
      request.withCredentials = false
      request.send(body)
    } catch {
      cleanup()
      reject(new ImageUploadTransportError("NETWORK_AMBIGUOUS"))
    }
  })
}

export { ImageUploadTransportError, transportImageUpload }
