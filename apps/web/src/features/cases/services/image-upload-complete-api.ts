import { caseFetch } from "./case-fetch"
import { z } from "zod"

import type { CompletedImageUpload } from "../types/completed-image-upload"
import type { ImageUploadIdentity } from "../types/image-upload-session"

const UUID = z.string().uuid()
const CompletedSchema: z.ZodType<CompletedImageUpload> = z.object({
  uploadId: UUID, imageId: UUID, caseId: UUID,
  kind: z.enum(["DICOM", "PNG", "JPEG"]),
  mediaType: z.enum(["application/dicom", "image/dicom", "image/png", "image/jpeg"]),
  sizeBytes: z.number().int().min(1).max(100 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.literal("QUARANTINED"),
  completedAt: z.iso.datetime({ offset: true }),
  jobId: UUID,
  jobStatus: z.enum(["QUEUED", "PROCESSING", "SUCCEEDED", "REJECTED", "FAILED"]),
})
const ErrorSchema = z.object({ error: z.object({
  code: z.string(), retryable: z.boolean(), reason: z.string().optional(),
}) })

class ImageUploadCompleteError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly reason?: string

  constructor(code: string, retryable: boolean, reason?: string) {
    super(code)
    this.name = "ImageUploadCompleteError"
    this.code = code
    this.retryable = retryable
    this.reason = reason
  }
}

async function completeImageUpload(
  identity: ImageUploadIdentity,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<CompletedImageUpload> {
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(
      `/api/cases/${encodeURIComponent(identity.caseId)}/image-uploads/${encodeURIComponent(identity.uploadId)}/complete`,
      { method: "POST", credentials: "same-origin", cache: "no-store", signal: options.signal },
    )
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ImageUploadCompleteError("NETWORK_ERROR", true)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ImageUploadCompleteError("INVALID_RESPONSE", false)
  }
  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(body)
    throw parsed.success
      ? new ImageUploadCompleteError(parsed.data.error.code, parsed.data.error.retryable, parsed.data.error.reason)
      : new ImageUploadCompleteError("INVALID_RESPONSE", false)
  }
  const parsed = CompletedSchema.safeParse(body)
  if (response.status !== 202 || !parsed.success
    || parsed.data.uploadId.toLowerCase() !== identity.uploadId.toLowerCase()
    || parsed.data.imageId.toLowerCase() !== identity.imageId.toLowerCase()
    || parsed.data.caseId.toLowerCase() !== identity.caseId.toLowerCase()
    || parsed.data.kind !== identity.kind || parsed.data.mediaType !== identity.mediaType
    || parsed.data.sizeBytes !== identity.sizeBytes || parsed.data.sha256 !== identity.sha256) {
    throw new ImageUploadCompleteError("INVALID_RESPONSE", false)
  }
  return parsed.data
}

async function completeImageUploadWithVisibilityRetry(
  identity: ImageUploadIdentity,
  options: {
    signal?: AbortSignal
    completeImpl?: typeof completeImageUpload
    wait?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
  } = {},
): Promise<CompletedImageUpload> {
  const complete = options.completeImpl ?? completeImageUpload
  const wait = options.wait ?? waitForVisibility
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await complete(identity, { signal: options.signal })
    } catch (error) {
      if (!(error instanceof ImageUploadCompleteError)
        || error.code !== "IMAGE_UPLOAD_OBJECT_INVALID" || error.reason !== "object_not_found"
        || attempt === 2) throw error
      await wait((attempt + 1) * 1_000, options.signal)
    }
  }
  throw new ImageUploadCompleteError("INVALID_RESPONSE", false)
}

function waitForVisibility(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"))
    const timer = setTimeout(() => { cleanup(); resolve() }, milliseconds)
    const onAbort = () => { clearTimeout(timer); cleanup(); reject(new DOMException("Aborted", "AbortError")) }
    const cleanup = () => signal?.removeEventListener("abort", onAbort)
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

export { completeImageUpload, completeImageUploadWithVisibilityRetry, ImageUploadCompleteError }
