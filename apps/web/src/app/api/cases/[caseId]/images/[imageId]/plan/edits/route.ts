import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { saveImagePlanEditForBff } from "@/lib/server/image-plan-bff"
import { readBoundedRequestBody } from "@/lib/server/request-security"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
type Context = { params: Promise<{ caseId: string; imageId: string }> }

export async function PATCH(request: NextRequest, context: Context) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    let body: unknown
    try {
      // Quality notes allow 2000 Unicode characters. Keep calibration's separate
      // 4 KiB limit intact; this bounded command allows up to 12 KiB in UTF-8.
      const bytes = await readBoundedRequestBody(request, 12 * 1024)
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false, uncertain: false } }, 400)
      throw error
    }
    const { caseId, imageId } = await context.params
    const result = await saveImagePlanEditForBff(caseId, imageId, body,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams, signal }),
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}/plan", pathParams, signal }),
      (pathParams, input, signal) => client.request({ method: "put", path: "/api/v1/images/{image_id}/plan", pathParams, body: input, signal }), request.signal)
    return createCasesResponse(result.body, result.status)
  }, { body: "application/json", method: "PATCH" })
}
