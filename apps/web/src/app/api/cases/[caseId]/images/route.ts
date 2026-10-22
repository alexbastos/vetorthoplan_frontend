import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { listCaseImagesForBff } from "@/lib/server/case-images-bff"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId } = await context.params
    const result = await listCaseImagesForBff(caseId,
      (pathParams, signal) => client.request({
        method: "get", path: "/api/v1/cases/{case_id}/images", pathParams, signal,
      }), request.signal)
    return createCasesResponse(result.body, result.status)
  })
}
