import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { getTploClinicalProtocolForBff } from "@/lib/server/tplo-reference-bff"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const result = await getTploClinicalProtocolForBff(signal =>
      client.request({ method: "get", path: "/api/v1/tplo/clinical-protocol", signal }), request.signal)
    return createCasesResponse(result.body, result.status)
  })
}
