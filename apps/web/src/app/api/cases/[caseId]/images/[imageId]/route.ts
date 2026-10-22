import type { NextRequest } from "next/server"

import { createCasesResponse, createEmptyCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { deleteImageForBff } from "@/lib/server/image-delete-bff"

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
