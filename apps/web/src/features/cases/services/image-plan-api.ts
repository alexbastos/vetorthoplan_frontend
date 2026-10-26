import { z } from "zod"

import { ImagePlanSchema, SaveCalibrationSchema, calibrationMatches, type ImagePlan, type SaveCalibrationInput } from "../schemas/image-plan.schema"
import { caseFetch } from "./case-fetch"

const uuid = z.string().uuid()
const errorSchema = z.object({ error: z.object({ code: z.enum([
  "ACCESS_DENIED", "SESSION_UNAVAILABLE", "REQUEST_NOT_ALLOWED", "CLINICAL_CONTEXT_CHANGED", "CLINICAL_ORGANIZATION_REQUIRED",
  "IMAGE_NOT_FOUND", "IMAGE_NOT_READY", "IMAGE_DIMENSIONS_REQUIRED", "CALIBRATION_GEOMETRY_UNSUPPORTED",
  "PLAN_REVISION_CONFLICT", "PLAN_SAVE_NOT_ALLOWED", "CLINICAL_VALIDATION_INVALID", "VALIDATION_ERROR", "INVALID_RESPONSE", "SERVICE_UNAVAILABLE",
]), uncertain: z.boolean().optional(), currentRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional() }) })
type Options = { fetchImpl?: typeof fetch; signal?: AbortSignal }

class ImagePlanError extends Error {
  readonly code: string
  readonly uncertain: boolean
  readonly currentRevision?: number
  constructor(code: string, uncertain = false, currentRevision?: number) {
    super(code)
    this.name = "ImagePlanError"
    this.code = code
    this.uncertain = uncertain
    this.currentRevision = currentRevision
  }
}

async function requestPlan(caseId: string, imageId: string, input: SaveCalibrationInput | undefined, options: Options): Promise<ImagePlan> {
  if (!uuid.safeParse(caseId).success || !uuid.safeParse(imageId).success) throw new ImagePlanError("VALIDATION_ERROR")
  const writing = input !== undefined
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(`/api/cases/${encodeURIComponent(caseId)}/images/${encodeURIComponent(imageId)}/plan`, {
      method: writing ? "PUT" : "GET", cache: "no-store", credentials: "same-origin", signal: options.signal,
      ...(writing ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}),
    })
  } catch (error) {
    if (!writing && options.signal?.aborted) throw error
    throw new ImagePlanError("NETWORK_ERROR", writing)
  }
  let body: unknown
  try { body = await response.json() } catch { throw new ImagePlanError("INVALID_RESPONSE", writing) }
  if (!writing && options.signal?.aborted) throw new DOMException("Aborted", "AbortError")
  if (response.status !== 200) {
    const parsed = errorSchema.safeParse(body)
    if (!parsed.success) throw new ImagePlanError("INVALID_RESPONSE", writing)
    throw new ImagePlanError(parsed.data.error.code, writing && (parsed.data.error.uncertain ?? response.status >= 500), parsed.data.error.currentRevision)
  }
  const parsed = ImagePlanSchema.safeParse(body)
  if (!parsed.success || parsed.data.imageId.toLowerCase() !== imageId.toLowerCase()
    || writing && (parsed.data.revision !== input.baseRevision + 1 || !calibrationMatches(parsed.data.document.calibration, input.calibration)
      || input.calibration !== null && !parsed.data.document.calibration?.result)) throw new ImagePlanError("INVALID_RESPONSE", writing)
  return parsed.data
}

function fetchImagePlan(caseId: string, imageId: string, options: Options = {}): Promise<ImagePlan> {
  return requestPlan(caseId, imageId, undefined, options)
}

function saveImageCalibration(caseId: string, imageId: string, value: SaveCalibrationInput, options: Options = {}): Promise<ImagePlan> {
  const input = SaveCalibrationSchema.safeParse(value)
  if (!input.success) return Promise.reject(new ImagePlanError("VALIDATION_ERROR"))
  return requestPlan(caseId, imageId, input.data, options)
}

export { fetchImagePlan, saveImageCalibration, ImagePlanError }
