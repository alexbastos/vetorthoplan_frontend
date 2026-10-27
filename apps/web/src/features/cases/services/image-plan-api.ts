import { z } from "zod"

import { caseFetch } from "./case-fetch"

const PlanResponseSchema = z.object({
  image_id: z.string().uuid(),
  revision: z.number().int().min(0),
  document: z.record(z.string(), z.unknown()),
  updated_at: z.iso.datetime({ offset: true }).nullable(),
})
const ErrorSchema = z.object({ error: z.object({ code: z.string(), retryable: z.boolean() }) })
const RotationTableSchema = z.object({
  configured: z.boolean(), table_version: z.string().nullable(), source: z.string().nullable(),
  source_url: z.string().nullable(), target_slope_degrees: z.number().nullable(),
  match_count: z.number().int().min(0), entries: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  recommendation_enabled: z.literal(false),
})

type PlanDocument = Record<string, unknown> & { schema_version: 1 }
type ImagePlan = Readonly<{ imageId: string; revision: number; document: PlanDocument; updatedAt: string | null }>

class ImagePlanError extends Error {
  constructor(readonly code: string, readonly retryable: boolean) { super(code); this.name = "ImagePlanError" }
}

async function getImagePlan(caseId: string, imageId: string, signal?: AbortSignal): Promise<ImagePlan> {
  return requestPlan(caseId, imageId, { method: "GET", signal })
}

async function saveImagePlan(caseId: string, imageId: string, revision: number, document: PlanDocument): Promise<ImagePlan> {
  return requestPlan(caseId, imageId, { method: "PUT", body: JSON.stringify({ base_revision: revision, document }) })
}

async function getTploRotationTable(tpa: number, bladeDiameterMm: number): Promise<z.infer<typeof RotationTableSchema>> {
  let response: Response
  try {
    response = await caseFetch(`/api/cases/tplo/rotation-table?tpa_degrees=${encodeURIComponent(tpa)}&blade_diameter_mm=${encodeURIComponent(bladeDiameterMm)}`, {
      cache: "no-store", credentials: "same-origin",
    })
  } catch { throw new ImagePlanError("NETWORK_ERROR", true) }
  let payload: unknown
  try { payload = await response.json() } catch { throw new ImagePlanError("INVALID_RESPONSE", false) }
  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(payload)
    throw parsed.success ? new ImagePlanError(parsed.data.error.code, parsed.data.error.retryable) : new ImagePlanError("INVALID_RESPONSE", false)
  }
  const parsed = RotationTableSchema.safeParse(payload)
  if (response.status !== 200 || !parsed.success) throw new ImagePlanError("INVALID_RESPONSE", false)
  return parsed.data
}

async function requestPlan(caseId: string, imageId: string, init: RequestInit): Promise<ImagePlan> {
  let response: Response
  try {
    response = await caseFetch(`/api/cases/${encodeURIComponent(caseId)}/images/${encodeURIComponent(imageId)}/plan`, {
      ...init, cache: "no-store", credentials: "same-origin",
      headers: { "content-type": "application/json", ...init.headers },
    })
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new ImagePlanError("NETWORK_ERROR", true)
  }
  let payload: unknown
  try { payload = await response.json() } catch { throw new ImagePlanError("INVALID_RESPONSE", false) }
  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(payload)
    throw parsed.success ? new ImagePlanError(parsed.data.error.code, parsed.data.error.retryable)
      : new ImagePlanError("INVALID_RESPONSE", false)
  }
  const parsed = PlanResponseSchema.safeParse(payload)
  if (response.status !== 200 || !parsed.success || parsed.data.image_id.toLowerCase() !== imageId.toLowerCase()) {
    throw new ImagePlanError("INVALID_RESPONSE", false)
  }
  return { imageId: parsed.data.image_id, revision: parsed.data.revision, document: parsed.data.document as PlanDocument, updatedAt: parsed.data.updated_at }
}

export { getImagePlan, getTploRotationTable, ImagePlanError, saveImagePlan }
export type { ImagePlan, PlanDocument }
