import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { retryIngestionJobForBff } from "@/lib/server/ingestion-job-retry-bff"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string; jobId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, jobId } = await context.params
    const result = await retryIngestionJobForBff(caseId, jobId,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/jobs/{job_id}", pathParams, signal }),
      (pathParams, signal) => client.request({ method: "post", path: "/api/v1/jobs/{job_id}/retry", pathParams, signal }),
      request.signal)
    return createCasesResponse(result.body, result.status)
  }, { body: "none", method: "POST" })
}
