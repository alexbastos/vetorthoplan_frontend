import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { getImagePlanForBff, saveImagePlanForBff } from "@/lib/server/image-plan-bff"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ caseId: string; imageId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, imageId } = await context.params
    const result = await getImagePlanForBff(caseId, imageId,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams, signal }),
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}/plan", pathParams, signal }), request.signal)
    return createCasesResponse(result.body, result.status)
  })
}

export async function PUT(request: NextRequest, context: { params: Promise<{ caseId: string; imageId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, imageId } = await context.params
    let payload: unknown
    try { payload = await request.json() }
    catch { return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false } }, 400) }
    const result = await saveImagePlanForBff(caseId, imageId, payload,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams, signal }),
      (pathParams, body, signal) => client.request({ method: "put", path: "/api/v1/images/{image_id}/plan", pathParams, body, signal }), request.signal)
    return createCasesResponse(result.body, result.status)
  }, { body: "application/json", method: "PUT" })
}
