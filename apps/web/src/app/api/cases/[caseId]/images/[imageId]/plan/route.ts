import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { getImagePlanForBff, saveImageCalibrationForBff } from "@/lib/server/image-plan-bff"
import { readBoundedRequestBody } from "@/lib/server/request-security"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
type Context = { params: Promise<{ caseId: string; imageId: string }> }

export async function GET(request: NextRequest, context: Context) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, imageId } = await context.params
    const result = await getImagePlanForBff(caseId, imageId,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams, signal }),
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}/plan", pathParams, signal }), request.signal)
    return createCasesResponse(result.body, result.status)
  })
}

export async function PUT(request: NextRequest, context: Context) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    let body: unknown
    try {
      const bytes = await readBoundedRequestBody(request, 4 * 1024)
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false, uncertain: false } }, 400)
      throw error
    }
    const { caseId, imageId } = await context.params
    const result = await saveImageCalibrationForBff(caseId, imageId, body,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams, signal }),
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}/plan", pathParams, signal }),
      (pathParams, input, signal) => client.request({ method: "put", path: "/api/v1/images/{image_id}/plan", pathParams, body: input, signal }), request.signal)
    return createCasesResponse(result.body, result.status)
  }, { body: "application/json", method: "PUT" })
}
