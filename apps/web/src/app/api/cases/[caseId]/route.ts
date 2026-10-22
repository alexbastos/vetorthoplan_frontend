import type { NextRequest } from "next/server"

import { getCaseForBff } from "@/lib/server/case-detail-bff"
import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId } = await context.params
    const result = await getCaseForBff(
      caseId,
      (pathParams, signal) => client.request({
        method: "get",
        path: "/api/v1/cases/{case_id}",
        pathParams,
        signal,
      }),
      request.signal,
    )
    return createCasesResponse(result.body, result.status)
  })
}
