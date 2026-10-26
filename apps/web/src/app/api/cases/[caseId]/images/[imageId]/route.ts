import type { NextRequest } from "next/server"

import { createCasesResponse, createEmptyCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { deleteImageForBff } from "@/lib/server/image-delete-bff"
import { renameImageForBff } from "@/lib/server/image-rename-bff"
import { readBoundedRequestBody } from "@/lib/server/request-security"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function DELETE(request: NextRequest, context: { params: Promise<{ caseId: string; imageId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, imageId } = await context.params
    const result = await deleteImageForBff(caseId, imageId,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams, signal }),
      (pathParams, signal) => client.request({ method: "delete", path: "/api/v1/images/{image_id}", pathParams, signal }), request.signal)
    return result.status === 204 ? createEmptyCasesResponse() : createCasesResponse(result.body, result.status)
  }, { body: "none", method: "DELETE" })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ caseId: string; imageId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    let body: unknown
    try {
      const bytes = await readBoundedRequestBody(request, 2 * 1024)
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) {
        return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false } }, 400)
      }
      throw error
    }

    const { caseId, imageId } = await context.params
    const result = await renameImageForBff(caseId, imageId, body,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams, signal }),
      (pathParams, input, signal) => client.request({ method: "patch", path: "/api/v1/images/{image_id}", pathParams, body: input, signal }),
      request.signal)
    return createCasesResponse(result.body, result.status)
  }, { body: "application/json", method: "PATCH" })
}
