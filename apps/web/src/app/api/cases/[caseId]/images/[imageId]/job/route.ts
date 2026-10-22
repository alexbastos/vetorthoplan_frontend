import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { getImageIngestionJobForBff } from "@/lib/server/image-ingestion-job-bff"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest, context: { params: Promise<{ caseId: string; imageId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const { caseId, imageId } = await context.params
    const result = await getImageIngestionJobForBff(caseId, imageId,
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}", pathParams, signal }),
      (pathParams, signal) => client.request({ method: "get", path: "/api/v1/images/{image_id}/job", pathParams, signal }),
      request.signal)
    return createCasesResponse(result.body, result.status)
  })
}
