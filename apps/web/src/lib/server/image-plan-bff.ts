import "server-only"

import type { GetImagePath, GetImagePlanPath, SaveImagePlanPath, SaveImagePlanRequest } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import { calibrationMatches, ImagePlanSchema, SaveCalibrationSchema, UpstreamImagePlanSchema, type ImagePlan } from "../../features/cases/schemas/image-plan.schema"
import { ImageSchema } from "./case-images-bff"

type Reader<Path> = (path: Path, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
type Writer = (path: SaveImagePlanPath, input: SaveImagePlanRequest, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
type ErrorCode = "ACCESS_DENIED" | "IMAGE_NOT_FOUND" | "IMAGE_NOT_READY" | "IMAGE_DIMENSIONS_REQUIRED" |
  "CALIBRATION_GEOMETRY_UNSUPPORTED" | "PLAN_REVISION_CONFLICT" | "PLAN_SAVE_NOT_ALLOWED" |
  "CLINICAL_VALIDATION_INVALID" | "VALIDATION_ERROR" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE"
type Failure = { status: 400 | 403 | 404 | 409 | 422 | 502 | 503; body: { error: {
  code: ErrorCode; retryable: boolean; uncertain: boolean; currentRevision?: number
} } }
type Result = { status: 200; body: ImagePlan } | Failure
const uuid = z.string().uuid()
const upstreamError = z.object({ code: z.string() })
const conflictRevision = z.object({ details: z.object({ current_revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }) })

async function imageForPlan(caseId: string, imageId: string, readImage: Reader<GetImagePath>, signal?: AbortSignal) {
  const response = await readImage({ image_id: imageId }, signal)
  if (response.status !== 200) return { error: mapStatus(response.status, response.data) }
  const image = ImageSchema.safeParse(response.data)
  if (!image.success) return { error: failure(502, "INVALID_RESPONSE") }
  if (image.data.id.toLowerCase() !== imageId.toLowerCase() || image.data.case_id.toLowerCase() !== caseId.toLowerCase()) {
    return { error: failure(404, "IMAGE_NOT_FOUND") }
  }
  if (image.data.status !== "READY") return { error: failure(409, "IMAGE_NOT_READY") }
  return { image: image.data }
}

function projectPlan(data: unknown, imageId: string): ImagePlan | null {
  const parsed = UpstreamImagePlanSchema.safeParse(data)
  if (!parsed.success || parsed.data.image_id.toLowerCase() !== imageId.toLowerCase()) return null
  const plan = parsed.data
  const projected = ImagePlanSchema.safeParse({ imageId: plan.image_id, revision: plan.revision, document: plan.document, updatedAt: plan.updated_at })
  return projected.success ? projected.data : null
}

async function getImagePlanForBff(caseId: string, imageId: string, readImage: Reader<GetImagePath>, readPlan: Reader<GetImagePlanPath>, signal?: AbortSignal): Promise<Result> {
  if (!uuid.safeParse(caseId).success || !uuid.safeParse(imageId).success) return failure(400, "VALIDATION_ERROR")
  try {
    if (signal?.aborted) return failure(503, "SERVICE_UNAVAILABLE")
    const checked = await imageForPlan(caseId, imageId, readImage, signal)
    if (checked.error) return checked.error
    const response = await readPlan({ image_id: imageId }, signal)
    if (response.status !== 200) return mapStatus(response.status, response.data)
    const plan = projectPlan(response.data, imageId)
    return plan ? { status: 200, body: plan } : failure(502, "INVALID_RESPONSE")
  } catch (error) { return failure(error instanceof SyntaxError ? 502 : 503, error instanceof SyntaxError ? "INVALID_RESPONSE" : "SERVICE_UNAVAILABLE") }
}

async function saveImageCalibrationForBff(caseId: string, imageId: string, value: unknown,
  readImage: Reader<GetImagePath>, readPlan: Reader<GetImagePlanPath>, write: Writer, signal?: AbortSignal): Promise<Result> {
  const input = SaveCalibrationSchema.safeParse(value)
  if (!uuid.safeParse(caseId).success || !uuid.safeParse(imageId).success || !input.success) return failure(400, "VALIDATION_ERROR")
  let attempted = false
  try {
    if (signal?.aborted) return failure(503, "SERVICE_UNAVAILABLE")
    const checked = await imageForPlan(caseId, imageId, readImage, signal)
    if (checked.error) return checked.error
    const image = checked.image!
    if (!image.width_px || !image.height_px) return failure(409, "IMAGE_DIMENSIONS_REQUIRED")
    if (image.kind === "DICOM" && [image.pixel_spacing_mm, image.imager_pixel_spacing_mm].some(spacing =>
      spacing && Math.abs(spacing[0] / spacing[1] - 1) > 1e-6)) return failure(409, "CALIBRATION_GEOMETRY_UNSUPPORTED")
    const response = await readPlan({ image_id: imageId }, signal)
    if (response.status !== 200) return mapStatus(response.status, response.data)
    const current = projectPlan(response.data, imageId)
    if (!current) return failure(502, "INVALID_RESPONSE")
    if (current.revision !== input.data.baseRevision) return failure(409, "PLAN_REVISION_CONFLICT", false, current.revision)
    if (signal?.aborted) return failure(503, "SERVICE_UNAVAILABLE")
    // Only calibration is editable through this BFF endpoint. All other stored
    // fields survive; the backend alone recomputes derived measurements.
    const payload: SaveImagePlanRequest = { base_revision: current.revision,
      document: { ...current.document, calibration: input.data.calibration } }
    attempted = true
    const saved = await write({ image_id: imageId }, payload, signal)
    if (saved.status !== 200) return mapStatus(saved.status, saved.data, true)
    const plan = projectPlan(saved.data, imageId)
    if (!plan || plan.revision !== current.revision + 1 || !calibrationMatches(plan.document.calibration, input.data.calibration)
      || input.data.calibration !== null && !plan.document.calibration?.result) return failure(502, "INVALID_RESPONSE", true)
    return { status: 200, body: plan }
  } catch (error) {
    return failure(error instanceof SyntaxError ? 502 : 503, error instanceof SyntaxError ? "INVALID_RESPONSE" : "SERVICE_UNAVAILABLE", attempted)
  }
}

function mapStatus(status: number, data: unknown, attempted = false): Failure {
  // Details differ by error code. Read the optional revision hint separately;
  // an absent or malformed hint must not hide a recognized refusal.
  const parsed = upstreamError.safeParse(data)
  if (status === 404) return failure(404, "IMAGE_NOT_FOUND")
  if (status === 403) return failure(403, "ACCESS_DENIED")
  if (status === 409) {
    if (parsed.success && parsed.data.code === "PLAN_REVISION_CONFLICT") {
      const revision = conflictRevision.safeParse(data)
      return failure(409, "PLAN_REVISION_CONFLICT", false, revision.success ? revision.data.details.current_revision : undefined)
    }
    return failure(409, parsed.success && parsed.data.code === "IMAGE_NOT_READY" ? "IMAGE_NOT_READY" : "PLAN_SAVE_NOT_ALLOWED")
  }
  if (status === 400 || status === 422) return failure(status, parsed.success && parsed.data.code === "CLINICAL_VALIDATION_INVALID" ? "CLINICAL_VALIDATION_INVALID" : "VALIDATION_ERROR")
  return failure(status === 401 || status === 429 || status >= 500 ? 503 : 502,
    status === 401 || status === 429 || status >= 500 ? "SERVICE_UNAVAILABLE" : "INVALID_RESPONSE", attempted)
}

function failure(status: Failure["status"], code: ErrorCode, uncertain = false, currentRevision?: number): Failure {
  return { status, body: { error: { code, retryable: status === 503 && !uncertain, uncertain,
    ...(currentRevision === undefined ? {} : { currentRevision }) } } }
}

export { getImagePlanForBff, saveImageCalibrationForBff }
