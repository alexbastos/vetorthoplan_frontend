import type { NextRequest } from "next/server"
import { z } from "zod"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const Protocol = z.object({
  configured: z.boolean(), protocol_version: z.string().nullable().optional(), source: z.string().nullable().optional(),
  measurements: z.array(z.object({ id: z.string(), label: z.string(), kind: z.enum(["DISTANCE", "ANGLE"]), landmarks: z.array(z.string()), unit: z.enum(["mm", "degrees"]), max_absolute_error: z.number() })).optional(),
  tpa_max_absolute_error_degrees: z.number().nullable().optional(), acceptance_enabled: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const result = await client.request({ method: "get", path: "/api/v1/tplo/clinical-protocol", signal: request.signal })
    if (result.status !== 200) return createCasesResponse({ error: { code: "SERVICE_UNAVAILABLE", retryable: result.status >= 500 } }, result.status)
    const parsed = Protocol.safeParse(result.data)
    return parsed.success ? createCasesResponse(parsed.data, 200) : createCasesResponse({ error: { code: "INVALID_RESPONSE", retryable: false } }, 502)
  })
}
