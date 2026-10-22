import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { completeImageUploadForBff } from "@/lib/server/image-upload-complete-bff"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string; uploadId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, uploadId } = await context.params
    const result = await completeImageUploadForBff(
      caseId,
      uploadId,
      (pathParams, signal) => client.request({
        method: "post",
        path: "/api/v1/image-uploads/{upload_id}/complete",
        pathParams,
        signal,
      }),
      request.signal,
    )
    return createCasesResponse(result.body, result.status)
  }, { body: "none", method: "POST" })
}
