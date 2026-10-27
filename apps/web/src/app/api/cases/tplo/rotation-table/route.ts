import type { NextRequest } from "next/server"

import { parseTploRotationQuery } from "@/features/cases/schemas/tplo-reference.schema"
import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { getTploRotationTableForBff } from "@/lib/server/tplo-reference-bff"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const query = parseTploRotationQuery(request.nextUrl.searchParams)
    if (!query) return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false } }, 400)
    const result = await getTploRotationTableForBff(query, (query, signal) =>
      client.request({ method: "get", path: "/api/v1/tplo/rotation-table", query, signal }), request.signal)
    return createCasesResponse(result.body, result.status)
  })
}
