import type { NextRequest } from "next/server"

import { createCasesResponse, createEmptyCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { cancelImageUploadForBff } from "@/lib/server/image-upload-cancel-bff"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function DELETE(request: NextRequest, context: { params: Promise<{ caseId: string; uploadId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, uploadId } = await context.params
    const result = await cancelImageUploadForBff(caseId, uploadId,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/cases/{case_id}/images", pathParams, signal }),
      (pathParams, signal) => client.request({ method: "delete", path: "/api/v1/image-uploads/{upload_id}", pathParams, signal }), request.signal)
    return result.status === 204 ? createEmptyCasesResponse() : createCasesResponse(result.body, result.status)
  }, { body: "none", method: "DELETE" })
}
