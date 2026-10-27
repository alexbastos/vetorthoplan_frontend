import "server-only"

import type { GetImagePath, GetImagePlanPath, SaveImagePlanPath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

const UUID = z.string().uuid()
const ImageSchema = z.object({ id: UUID, case_id: UUID })
const PlanSchema = z.object({ image_id: UUID, revision: z.number().int().min(0), document: z.record(z.string(), z.unknown()), updated_at: z.string().nullable() })
type Reader = (path: GetImagePath, signal?: AbortSignal) => Promise<{ data: unknown; status: number }>
type PlanReader = (path: GetImagePlanPath, signal?: AbortSignal) => Promise<{ data: unknown; status: number }>
type Writer = (path: SaveImagePlanPath, body: never, signal?: AbortSignal) => Promise<{ data: unknown; status: number }>
type Result = { status: 200; body: unknown } | { status: 400 | 403 | 404 | 409 | 422 | 502 | 503; body: { error: { code: string; retryable: boolean } } }

async function getImagePlanForBff(caseId: string, imageId: string, readImage: Reader, readPlan: PlanReader, signal?: AbortSignal): Promise<Result> {
  const image = await resolveImage(caseId, imageId, readImage, signal)
  if ("status" in image) return image
  let result: Awaited<ReturnType<PlanReader>>
  try { result = await readPlan({ image_id: imageId }, signal) }
  catch { return fail(503, "SERVICE_UNAVAILABLE", true) }
  if (result.status === 404) return fail(404, "IMAGE_NOT_FOUND", false)
  if (result.status === 409) return fail(409, "IMAGE_NOT_READY", false)
  if (result.status === 403) return fail(403, "ACCESS_DENIED", false)
  if (result.status === 401 || result.status === 429 || result.status >= 500) return fail(503, "SERVICE_UNAVAILABLE", true)
  const parsed = PlanSchema.safeParse(result.data)
  if (result.status !== 200 || !parsed.success || parsed.data.image_id.toLowerCase() !== imageId.toLowerCase()) return fail(502, "INVALID_RESPONSE", false)
  return { status: 200, body: parsed.data }
}

async function saveImagePlanForBff(caseId: string, imageId: string, payload: unknown, readImage: Reader, writePlan: Writer, signal?: AbortSignal): Promise<Result> {
  const image = await resolveImage(caseId, imageId, readImage, signal)
  if ("status" in image) return image
  const body = z.object({ base_revision: z.number().int().min(0), document: z.record(z.string(), z.unknown()) }).safeParse(payload)
  if (!body.success) return fail(400, "VALIDATION_ERROR", false)
  let result: Awaited<ReturnType<Writer>>
  try { result = await writePlan({ image_id: imageId }, body.data as never, signal) }
  catch { return fail(503, "SERVICE_UNAVAILABLE", true) }
  if (result.status === 404) return fail(404, "IMAGE_NOT_FOUND", false)
  if (result.status === 409) return fail(409, "PLAN_REVISION_CONFLICT", false)
  if (result.status === 422) return fail(422, "CLINICAL_VALIDATION_INVALID", false)
  if (result.status === 403) return fail(403, "ACCESS_DENIED", false)
  if (result.status === 401 || result.status === 429 || result.status >= 500) return fail(503, "SERVICE_UNAVAILABLE", true)
  const parsed = PlanSchema.safeParse(result.data)
  if (result.status !== 200 || !parsed.success || parsed.data.image_id.toLowerCase() !== imageId.toLowerCase()) return fail(502, "INVALID_RESPONSE", false)
  return { status: 200, body: parsed.data }
}

async function resolveImage(caseId: string, imageId: string, read: Reader, signal?: AbortSignal): Promise<{ image_id: string; case_id: string } | Extract<Result, { status: 400 | 403 | 404 | 409 | 422 | 502 | 503 }>> {
  if (!UUID.safeParse(caseId).success || !UUID.safeParse(imageId).success) return fail(400, "VALIDATION_ERROR", false)
  let response: Awaited<ReturnType<Reader>>
  try { response = await read({ image_id: imageId }, signal) }
  catch { return fail(503, "SERVICE_UNAVAILABLE", true) }
  if (response.status === 404) return fail(404, "IMAGE_NOT_FOUND", false)
  if (response.status === 403) return fail(403, "ACCESS_DENIED", false)
  if (response.status === 401 || response.status === 429 || response.status >= 500) return fail(503, "SERVICE_UNAVAILABLE", true)
  const parsed = ImageSchema.safeParse(response.data)
  if (response.status !== 200 || !parsed.success) return fail(502, "INVALID_RESPONSE", false)
  if (parsed.data.case_id.toLowerCase() !== caseId.toLowerCase()) return fail(404, "IMAGE_NOT_FOUND", false)
  return { image_id: parsed.data.id, case_id: parsed.data.case_id }
}

function fail(status: 400 | 403 | 404 | 409 | 422 | 502 | 503, code: string, retryable: boolean): Extract<Result, { status: 400 | 403 | 404 | 409 | 422 | 502 | 503 }> {
  return { status, body: { error: { code, retryable } } }
}

export { getImagePlanForBff, saveImagePlanForBff }
