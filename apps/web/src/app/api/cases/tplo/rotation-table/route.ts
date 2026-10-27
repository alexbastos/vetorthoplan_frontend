import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const url = new URL(request.url)
    const tpa = url.searchParams.get("tpa_degrees")
    const blade = url.searchParams.get("blade_diameter_mm")
    if (!tpa || !blade || !Number.isFinite(Number(tpa)) || !Number.isFinite(Number(blade))) {
      return createCasesResponse({ error: { code: "VALIDATION_ERROR", retryable: false } }, 400)
    }
    const result = await client.request({
      method: "get", path: "/api/v1/tplo/rotation-table",
      query: { tpa_degrees: Number(tpa), blade_diameter_mm: Number(blade) },
    } as never)
    return createCasesResponse(result.data, result.status)
  })
}
