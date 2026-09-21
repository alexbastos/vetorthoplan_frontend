import { createUpstreamErrorResponse } from "@/lib/server/auth-bff-route"
import { parseActiveSessionsResponse } from "@/features/settings/schemas/active-sessions-response.schema"
import { createSettingsResponse, withAuthenticatedSettingsRoute } from "@/lib/server/settings-bff-route"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "session",
    body: "none",
    method: "POST",
  }, async (context) => {
    const upstreamResponse = await context.client.getActiveSessions({ accessToken: context.session.accessToken })
    const activeSessions = upstreamResponse.status === 200
      ? parseActiveSessionsResponse(upstreamResponse.data)
      : undefined

    if (!activeSessions) {
      return createUpstreamErrorResponse("session", upstreamResponse)
    }

    return createSettingsResponse(activeSessions)
  })
}
