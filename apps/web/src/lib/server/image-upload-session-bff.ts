import "server-only"

import type { CreateImageUploadHeaders, CreateImageUploadRequest, CreateImageUploadPath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { ImageUploadSession } from "@/features/cases/types/image-upload-session"
import { isValidUploadIdempotencyKey } from "../../features/cases/lib/image-upload-attempt"

const MAX_IMAGE_BYTES = 100 * 1024 * 1024
const FIELD_NAMES = new Set(["original_filename", "media_type", "size_bytes", "sha256"])
const SAFE_ERROR_TYPE = /^[a-z][a-z0-9_]{0,63}$/
const SIMPLE_FILENAME = /^[^/\\\x00-\x1f\x7f]+$/
const UUID = z.string().uuid()
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const MetadataSchema = z.object({
  original_filename: z.string().min(1).max(255).regex(SIMPLE_FILENAME),
  media_type: z.enum(["application/dicom", "image/dicom", "image/png", "image/jpeg"]),
  size_bytes: z.number().int().min(1).max(MAX_IMAGE_BYTES),
  sha256: Sha256,
}).strict().superRefine((value, context) => {
  const extension = value.original_filename.split(".").pop()?.toLowerCase()
  const valid = extension === "dcm" || extension === "dicom"
    ? value.media_type === "application/dicom" || value.media_type === "image/dicom"
    : extension === "png" ? value.media_type === "image/png"
      : extension === "jpg" || extension === "jpeg" ? value.media_type === "image/jpeg" : false
  if (!valid) context.addIssue({ code: "custom", path: ["media_type"], message: "extension_mismatch" })
})

const ResponseSchema = z.object({
  upload_id: UUID,
  image_id: UUID,
  case_id: UUID,
  kind: z.enum(["DICOM", "PNG", "JPEG"]),
  media_type: z.enum(["application/dicom", "image/dicom", "image/png", "image/jpeg"]),
  size_bytes: z.number().int().min(1).max(MAX_IMAGE_BYTES),
  sha256: Sha256,
  status: z.literal("PENDING_UPLOAD"),
  upload: z.object({
    method: z.literal("POST"),
    url: z.string().url().refine((value) => {
      const url = new URL(value)
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !url.hash
    }),
    fields: z.record(z.string(), z.string()),
    expires_at: z.iso.datetime({ offset: true }),
  }),
})

type FieldError = { field: string; type: string }
type ErrorCode = "ACCESS_DENIED" | "CASE_NOT_FOUND" | "IMAGE_UPLOAD_LIMIT_EXCEEDED" |
  "IMAGE_UPLOAD_SESSION_CONFLICT" | "IMAGE_UPLOAD_DUPLICATE" |
  "IMAGE_UPLOAD_VALIDATION_ERROR" | "INVALID_RESPONSE" | "REQUEST_VALIDATION_ERROR" |
  "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type Failure = { body: { error: { code: ErrorCode; retryable: boolean; fieldErrors?: FieldError[] } }; status: 400 | 403 | 404 | 409 | 422 | 502 | 503 }
type Result = { body: ImageUploadSession; status: 201 } | Failure
type Writer = (path: CreateImageUploadPath, body: CreateImageUploadRequest,
  headers: CreateImageUploadHeaders, signal?: AbortSignal) => Promise<{ data: unknown; status: number }>

async function createImageUploadSessionForBff(
  caseId: string,
  value: unknown,
  idempotencyKey: string | null,
  writeSession: Writer,
  signal?: AbortSignal,
): Promise<Result> {
  if (!UUID.safeParse(caseId).success || !isValidUploadIdempotencyKey(idempotencyKey)) {
    return failure(400, "VALIDATION_ERROR", false)
  }
  const parsed = MetadataSchema.safeParse(value)
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.flatMap((issue): FieldError[] => {
      const field = String(issue.path[0] ?? "")
      return FIELD_NAMES.has(field) ? [{ field, type: issue.code === "custom" ? "extension_mismatch" : "invalid" }] : []
    })
    return failure(400, "REQUEST_VALIDATION_ERROR", false, fieldErrors)
  }

  let upstream: Awaited<ReturnType<Writer>>
  try {
    upstream = await writeSession({ case_id: caseId }, parsed.data, { "Idempotency-Key": idempotencyKey }, signal)
  } catch (error) {
    return error instanceof SyntaxError
      ? failure(502, "INVALID_RESPONSE", false) : failure(503, "SERVICE_UNAVAILABLE", true)
  }

  if (upstream.status === 404) return failure(404, "CASE_NOT_FOUND", false)
  if (upstream.status === 409) {
    const error = z.object({ code: z.string().min(1) }).safeParse(upstream.data)
    if (!error.success) return failure(502, "INVALID_RESPONSE", false)
    if (error.data.code === "IMAGE_UPLOAD_DUPLICATE") return failure(409, "IMAGE_UPLOAD_DUPLICATE", false)
    return failure(409, error.data.code === "IMAGE_UPLOAD_LIMIT_EXCEEDED"
      ? "IMAGE_UPLOAD_LIMIT_EXCEEDED" : "IMAGE_UPLOAD_SESSION_CONFLICT", false)
  }
  if (upstream.status === 422) return mapValidationError(upstream.data)
  if (upstream.status === 403) return failure(403, "ACCESS_DENIED", false)
  if (upstream.status === 401 || upstream.status === 429 || upstream.status >= 500) {
    return failure(503, "SERVICE_UNAVAILABLE", true)
  }
  if (upstream.status !== 201) return failure(502, "INVALID_RESPONSE", false)

  const response = ResponseSchema.safeParse(upstream.data)
  if (!response.success) return failure(502, "INVALID_RESPONSE", false)
  const item = response.data
  const kind = parsed.data.media_type.includes("dicom") ? "DICOM"
    : parsed.data.media_type === "image/png" ? "PNG" : "JPEG"
  if (item.case_id.toLowerCase() !== caseId.toLowerCase() || item.kind !== kind
    || item.media_type !== parsed.data.media_type || item.size_bytes !== parsed.data.size_bytes
    || item.sha256 !== parsed.data.sha256 || Object.keys(item.upload.fields).length === 0) {
    return failure(502, "INVALID_RESPONSE", false)
  }

  return { status: 201, body: {
    uploadId: item.upload_id, imageId: item.image_id, caseId: item.case_id,
    kind: item.kind, mediaType: item.media_type, sizeBytes: item.size_bytes,
    sha256: item.sha256, status: item.status,
    upload: { method: item.upload.method, url: item.upload.url,
      fields: item.upload.fields, expiresAt: item.upload.expires_at },
  } }
}

function mapValidationError(value: unknown): Failure {
  const parsed = z.object({ code: z.enum(["REQUEST_VALIDATION_ERROR", "IMAGE_UPLOAD_VALIDATION_ERROR"]), details: z.unknown().optional() }).safeParse(value)
  if (!parsed.success) return failure(502, "INVALID_RESPONSE", false)
  const details = z.object({ errors: z.array(z.object({ field: z.string(), type: z.string() })) }).safeParse(parsed.data.details)
  const fieldErrors = details.success ? details.data.errors.filter(({ field, type }) =>
    FIELD_NAMES.has(field) && SAFE_ERROR_TYPE.test(type)) : []
  return failure(422, parsed.data.code, false, fieldErrors)
}

function failure(status: Failure["status"], code: ErrorCode, retryable: boolean, fieldErrors?: FieldError[]): Failure {
  return { status, body: { error: { code, retryable, ...(fieldErrors ? { fieldErrors } : {}) } } }
}

export { createImageUploadSessionForBff }
