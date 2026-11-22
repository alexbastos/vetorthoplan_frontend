import type { NextRequest } from "next/server"

import { MAX_PLAN_EDIT_BODY_BYTES, planEditBodyLimit } from "@/features/cases/schemas/image-plan-command.schema"
import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { saveImagePlanEditForBff } from "@/lib/server/image-plan-bff"
import { readBoundedRequestBody, RequestSecurityError } from "@/lib/server/request-security"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
type Context = { params: Promise<{ caseId: string; imageId: string }> }

export async function PATCH(request: NextRequest, context: Context) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    let body: unknown
    try {
      // Bound the stream first, then enforce the command family's UTF-8 budget,
      // including whitespace and escapes in the original body.
      const bytes = await readBoundedRequestBody(request, MAX_PLAN_EDIT_BODY_BYTES)
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown
      const kind = body !== null && typeof body === "object" && "kind" in body ? body.kind : undefined
      if (bytes.byteLength > planEditBodyLimit(kind)) throw new RequestSecurityError("payload_too_large", 413)
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
