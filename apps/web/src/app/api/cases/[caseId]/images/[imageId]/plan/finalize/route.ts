import type { NextRequest } from "next/server"
import { z } from "zod"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const Uuid = z.string().uuid()
const FinalizedPlan = z.object({
  image_id: Uuid,
  version: z.number().int().positive(),
  plan_revision: z.number().int().positive(),
  snapshot: z.record(z.string(), z.unknown()),
  snapshot_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  report_template_version: z.string(),
  finalized_by: Uuid,
  finalized_at: z.iso.datetime({ offset: true }),
  reports: z.array(z.object({
    format: z.enum(["PNG", "PDF"]),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    download_url: z.url(),
    expires_at: z.iso.datetime({ offset: true }),
  })).length(2),
})

export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string; imageId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, imageId } = await context.params
    if (!Uuid.safeParse(caseId).success || !Uuid.safeParse(imageId).success) {
      return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false } }, 400)
    }
    const image = await client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams: { image_id: imageId }, signal: request.signal })
    if (image.status !== 200 || !z.object({ case_id: Uuid }).safeParse(image.data).success || (image.data as { case_id: string }).case_id.toLowerCase() !== caseId.toLowerCase()) {
      return createCasesResponse({ error: { code: image.status === 403 ? "ACCESS_DENIED" : "IMAGE_NOT_FOUND", retryable: false } }, image.status === 403 ? 403 : 404)
    }
    let payload: unknown
    try { payload = await request.json() } catch { return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false } }, 400) }
    const body = z.object({ base_revision: z.number().int().positive() }).safeParse(payload)
    if (!body.success) return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false } }, 400)
    const result = await client.request({ method: "post", path: "/api/v1/images/{image_id}/plan/finalize", pathParams: { image_id: imageId }, body: body.data, signal: request.signal })
    if (result.status !== 200) return createCasesResponse({ error: { code: result.status === 409 ? "PLAN_REVISION_CONFLICT" : result.status === 422 ? "CLINICAL_VALIDATION_INVALID" : "SERVICE_UNAVAILABLE", retryable: result.status >= 500 } }, result.status)
    const parsed = FinalizedPlan.safeParse(result.data)
    if (!parsed.success || parsed.data.image_id.toLowerCase() !== imageId.toLowerCase()) return createCasesResponse({ error: { code: "INVALID_RESPONSE", retryable: false } }, 502)
    return createCasesResponse(parsed.data, 200)
  }, { body: "application/json", method: "POST" })
}
