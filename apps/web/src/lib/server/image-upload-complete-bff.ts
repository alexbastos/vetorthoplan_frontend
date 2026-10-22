import "server-only"

import type { CompleteImageUploadPath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { CompletedImageUpload } from "@/features/cases/types/completed-image-upload"

const UUID = z.string().uuid()
const REASONS = [
  "object_not_found", "size_mismatch", "media_type_mismatch", "checksum_mismatch",
  "upload_id_mismatch", "uploaded_before_session",
] as const
const CompletionSchema = z.object({
  upload_id: UUID,
  image_id: UUID,
  case_id: UUID,
  kind: z.enum(["DICOM", "PNG", "JPEG"]),
  media_type: z.enum(["application/dicom", "image/dicom", "image/png", "image/jpeg"]),
  size_bytes: z.number().int().min(1).max(100 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.literal("QUARANTINED"),
  completed_at: z.iso.datetime({ offset: true }),
  job_id: UUID,
  job_status: z.enum(["QUEUED", "PROCESSING", "SUCCEEDED", "REJECTED", "FAILED"]),
})

type ConflictReason = (typeof REASONS)[number]
type ErrorCode = "ACCESS_DENIED" | "IMAGE_UPLOAD_EXPIRED" | "IMAGE_UPLOAD_NOT_FOUND" |
  "IMAGE_UPLOAD_OBJECT_INVALID" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type Failure = { body: { error: { code: ErrorCode; retryable: boolean; reason?: ConflictReason } }; status: 400 | 403 | 404 | 409 | 502 | 503 }
type Result = { body: CompletedImageUpload; status: 202 } | Failure
type Completer = (path: CompleteImageUploadPath, signal?: AbortSignal) => Promise<{ data: unknown; status: number }>

async function completeImageUploadForBff(
  caseId: string,
  uploadId: string,
  complete: Completer,
  signal?: AbortSignal,
): Promise<Result> {
  if (!UUID.safeParse(caseId).success || !UUID.safeParse(uploadId).success) {
    return failure(400, "VALIDATION_ERROR", false)
  }

  let upstream: Awaited<ReturnType<Completer>>
  try {
    upstream = await complete({ upload_id: uploadId }, signal)
  } catch (error) {
    return error instanceof SyntaxError
      ? failure(502, "INVALID_RESPONSE", false) : failure(503, "SERVICE_UNAVAILABLE", true)
  }

  if (upstream.status === 404) return failure(404, "IMAGE_UPLOAD_NOT_FOUND", false)
  if (upstream.status === 409) return mapConflict(upstream.data)
  if (upstream.status === 422) return failure(400, "VALIDATION_ERROR", false)
  if (upstream.status === 403) return failure(403, "ACCESS_DENIED", false)
  if (upstream.status === 401 || upstream.status === 429 || upstream.status >= 500) {
    return failure(503, "SERVICE_UNAVAILABLE", true)
  }
  if (upstream.status !== 202) return failure(502, "INVALID_RESPONSE", false)

  const parsed = CompletionSchema.safeParse(upstream.data)
  if (!parsed.success || parsed.data.case_id.toLowerCase() !== caseId.toLowerCase()
    || parsed.data.upload_id.toLowerCase() !== uploadId.toLowerCase()) {
    return failure(502, "INVALID_RESPONSE", false)
  }
  const item = parsed.data
  return { status: 202, body: {
    uploadId: item.upload_id, imageId: item.image_id, caseId: item.case_id,
    kind: item.kind, mediaType: item.media_type, sizeBytes: item.size_bytes,
    sha256: item.sha256, status: item.status, completedAt: item.completed_at,
    jobId: item.job_id, jobStatus: item.job_status,
  } }
}

function mapConflict(value: unknown): Failure {
  const parsed = z.object({ code: z.enum(["IMAGE_UPLOAD_EXPIRED", "IMAGE_UPLOAD_OBJECT_INVALID"]), details: z.unknown().optional() }).safeParse(value)
  if (!parsed.success) return failure(502, "INVALID_RESPONSE", false)
  if (parsed.data.code === "IMAGE_UPLOAD_EXPIRED") return failure(409, "IMAGE_UPLOAD_EXPIRED", false)
  const details = z.object({ reason: z.enum(REASONS) }).safeParse(parsed.data.details)
  return failure(409, "IMAGE_UPLOAD_OBJECT_INVALID", details.success && details.data.reason === "object_not_found", details.success ? details.data.reason : undefined)
}

function failure(status: Failure["status"], code: ErrorCode, retryable: boolean, reason?: ConflictReason): Failure {
  return { status, body: { error: { code, retryable, ...(reason ? { reason } : {}) } } }
}

export { completeImageUploadForBff }
