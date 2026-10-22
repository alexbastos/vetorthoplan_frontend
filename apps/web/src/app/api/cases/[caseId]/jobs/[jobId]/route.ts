import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { getIngestionJobForBff } from "@/lib/server/ingestion-job-bff"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ caseId: string; jobId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, jobId } = await context.params
    const result = await getIngestionJobForBff(caseId, jobId,
      (pathParams, signal) => client.request({
        method: "get", path: "/api/v1/jobs/{job_id}", pathParams, signal,
      }), request.signal)
    return createCasesResponse(result.body, result.status)
  })
}
