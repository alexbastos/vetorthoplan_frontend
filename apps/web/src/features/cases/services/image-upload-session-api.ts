import { caseFetch } from "./case-fetch"
import type { CreateImageUploadRequest } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import { isValidUploadIdempotencyKey } from "../lib/image-upload-attempt"
import { isUploadSignatureExpired } from "../lib/upload-signature-expiry"
import type { ImageUploadSession } from "../types/image-upload-session"

const UUID = z.string().uuid()
const SessionSchema: z.ZodType<ImageUploadSession> = z.object({
  uploadId: UUID,
  imageId: UUID,
  caseId: UUID,
  kind: z.enum(["DICOM", "PNG", "JPEG"]),
  mediaType: z.enum(["application/dicom", "image/dicom", "image/png", "image/jpeg"]),
  sizeBytes: z.number().int().min(1).max(100 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.literal("PENDING_UPLOAD"),
  upload: z.object({
    method: z.literal("POST"),
    url: z.string().url(),
    fields: z.record(z.string(), z.string()),
    expiresAt: z.iso.datetime({ offset: true }),
  }),
})
const ErrorSchema = z.object({ error: z.object({
  code: z.string(), retryable: z.boolean(),
  fieldErrors: z.array(z.object({ field: z.string(), type: z.string() })).optional(),
}) })

class ImageUploadSessionError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly fieldErrors: readonly { field: string; type: string }[]

  constructor(code: string, retryable: boolean, fieldErrors: readonly { field: string; type: string }[] = []) {
    super(code)
    this.name = "ImageUploadSessionError"
    this.code = code
    this.retryable = retryable
    this.fieldErrors = fieldErrors
  }
}

async function createImageUploadSession(
  caseId: string,
  input: CreateImageUploadRequest,
  idempotencyKey: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch; allowExpiredForCancellation?: boolean } = {},
): Promise<ImageUploadSession> {
  if (!isValidUploadIdempotencyKey(idempotencyKey)) {
    throw new ImageUploadSessionError("VALIDATION_ERROR", false)
  }
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(`/api/cases/${encodeURIComponent(caseId)}/image-uploads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(input),
      cache: "no-store",
      credentials: "same-origin",
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ImageUploadSessionError("NETWORK_ERROR", true)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ImageUploadSessionError("INVALID_RESPONSE", false)
  }
  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(body)
    throw parsed.success
      ? new ImageUploadSessionError(parsed.data.error.code, parsed.data.error.retryable, parsed.data.error.fieldErrors)
      : new ImageUploadSessionError("INVALID_RESPONSE", false)
  }

  const parsed = SessionSchema.safeParse(body)
  if (response.status !== 201 || !parsed.success || parsed.data.caseId.toLowerCase() !== caseId.toLowerCase()
    || parsed.data.sha256 !== input.sha256 || parsed.data.sizeBytes !== input.size_bytes
    || parsed.data.mediaType !== input.media_type) {
    throw new ImageUploadSessionError("INVALID_RESPONSE", false)
  }
  if (!options.allowExpiredForCancellation && isUploadSignatureExpired(parsed.data.upload.expiresAt)) {
    throw new ImageUploadSessionError("EXPIRED", false)
  }
  return parsed.data
}

export { createImageUploadSession, ImageUploadSessionError }
