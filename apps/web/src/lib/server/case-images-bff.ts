import "server-only"

import type { GetImageResponse, ListCaseImagesPath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { CaseImage } from "@/features/cases/types/case-image"
import { ImageOrientationPatientSchema, ImageStatusSchema, PixelSpacingMmSchema } from "../../features/cases/schemas/case-image.schema"

const UUID = z.string().uuid()
const DateTime = z.iso.datetime({ offset: true })
const ImageSchema = z.object({
  id: UUID, upload_id: UUID, job_id: UUID.nullable(), case_id: UUID,
  original_filename: z.string(), kind: z.enum(["DICOM", "PNG", "JPEG"]),
  display_name: z.string().nullable().default(null),
  media_type: z.string(), detected_media_type: z.string().nullable(),
  size_bytes: z.number().int().min(1).max(100 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  status: ImageStatusSchema,
  width_px: z.number().int().positive().nullable(), height_px: z.number().int().positive().nullable(),
  rejection_code: z.string().nullable(), created_at: DateTime,
  completed_at: DateTime.nullable(), processed_at: DateTime.nullable(),
  metadata: z.record(z.string(), z.string()),
  preview_available: z.boolean(),
  preview_width_px: z.number().int().positive().nullable(),
  preview_height_px: z.number().int().positive().nullable(),
  pixel_spacing_mm: PixelSpacingMmSchema,
  imager_pixel_spacing_mm: PixelSpacingMmSchema,
  image_orientation_patient: ImageOrientationPatientSchema,
}) satisfies z.ZodType<GetImageResponse>
const ListSchema = z.object({ items: z.array(ImageSchema) })

type ErrorCode = "ACCESS_DENIED" | "CASE_NOT_FOUND" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type Failure = { body: { error: { code: ErrorCode; retryable: boolean } }; status: 400 | 403 | 404 | 502 | 503 }
type Result = { body: { items: CaseImage[] }; status: 200 } | Failure
type Reader = (path: ListCaseImagesPath, signal?: AbortSignal) => Promise<{ data: unknown; status: number }>

async function listCaseImagesForBff(caseId: string, read: Reader, signal?: AbortSignal): Promise<Result> {
  if (!UUID.safeParse(caseId).success) return failure(400, "VALIDATION_ERROR", false)
  let upstream: Awaited<ReturnType<Reader>>
  try {
    upstream = await read({ case_id: caseId }, signal)
  } catch (error) {
    return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE", false)
      : failure(503, "SERVICE_UNAVAILABLE", true)
  }
  if (upstream.status === 404) return failure(404, "CASE_NOT_FOUND", false)
  if (upstream.status === 422) return failure(400, "VALIDATION_ERROR", false)
  if (upstream.status === 403) return failure(403, "ACCESS_DENIED", false)
  if (upstream.status === 401 || upstream.status === 429 || upstream.status >= 500) return failure(503, "SERVICE_UNAVAILABLE", true)
  if (upstream.status !== 200) return failure(502, "INVALID_RESPONSE", false)
  const parsed = ListSchema.safeParse(upstream.data)
  if (!parsed.success || parsed.data.items.some((item) => item.case_id.toLowerCase() !== caseId.toLowerCase())) {
    return failure(502, "INVALID_RESPONSE", false)
  }
  return { status: 200, body: { items: parsed.data.items.map(projectCaseImage) } }
}

function projectCaseImage(item: z.infer<typeof ImageSchema>): CaseImage {
  return {
    id: item.id, uploadId: item.upload_id, jobId: item.job_id, caseId: item.case_id,
    originalFilename: item.original_filename, displayName: item.display_name, kind: item.kind,
    mediaType: item.media_type, detectedMediaType: item.detected_media_type,
    sizeBytes: item.size_bytes, status: item.status,
    widthPx: item.width_px, heightPx: item.height_px,
    rejectionCode: item.rejection_code, createdAt: item.created_at,
    completedAt: item.completed_at, processedAt: item.processed_at,
    previewAvailable: item.preview_available,
    previewWidthPx: item.preview_width_px, previewHeightPx: item.preview_height_px,
    pixelSpacingMm: item.pixel_spacing_mm, imagerPixelSpacingMm: item.imager_pixel_spacing_mm,
    imageOrientationPatient: item.image_orientation_patient,
  }
}

function failure(status: Failure["status"], code: ErrorCode, retryable: boolean): Failure {
  return { status, body: { error: { code, retryable } } }
}

export { ImageSchema, listCaseImagesForBff, projectCaseImage }
