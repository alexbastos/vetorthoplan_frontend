import type { NextRequest } from "next/server"
import { z } from "zod"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const Uuid = z.string().uuid()
const FinalizedPlan = z.object({
  image_id: Uuid, version: z.number().int().positive(), plan_revision: z.number().int().positive(),
  snapshot: z.record(z.string(), z.unknown()), snapshot_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  report_template_version: z.string(), finalized_by: Uuid, finalized_at: z.iso.datetime({ offset: true }),
  reports: z.array(z.object({ format: z.enum(["PNG", "PDF"]), sha256: z.string().regex(/^[0-9a-f]{64}$/), download_url: z.url(), expires_at: z.iso.datetime({ offset: true }) })).length(2),
})

export async function GET(request: NextRequest, context: { params: Promise<{ caseId: string; imageId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, imageId } = await context.params
    if (!Uuid.safeParse(caseId).success || !Uuid.safeParse(imageId).success) return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false } }, 400)
    const image = await client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams: { image_id: imageId }, signal: request.signal })
    if (image.status !== 200 || !z.object({ case_id: Uuid }).safeParse(image.data).success || (image.data as { case_id: string }).case_id.toLowerCase() !== caseId.toLowerCase()) return createCasesResponse({ error: { code: "IMAGE_NOT_FOUND", retryable: false } }, 404)
    const result = await client.request({ method: "get", path: "/api/v1/images/{image_id}/plan/finalization", pathParams: { image_id: imageId }, signal: request.signal })
    if (result.status !== 200) return createCasesResponse({ error: { code: result.status === 404 ? "FINALIZATION_NOT_FOUND" : "SERVICE_UNAVAILABLE", retryable: result.status >= 500 } }, result.status)
    const parsed = FinalizedPlan.safeParse(result.data)
    if (!parsed.success || parsed.data.image_id.toLowerCase() !== imageId.toLowerCase()) return createCasesResponse({ error: { code: "INVALID_RESPONSE", retryable: false } }, 502)
    return createCasesResponse(parsed.data, 200)
  })
}
