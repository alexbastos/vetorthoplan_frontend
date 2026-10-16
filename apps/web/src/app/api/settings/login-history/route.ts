import { createUpstreamErrorResponse } from "@/lib/server/auth-bff-route"
import { createSettingsResponse, withAuthenticatedSettingsRoute } from "@/lib/server/settings-bff-route"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "login-history",
    body: "none",
    method: "POST",
  }, async (context) => {
    const upstreamResponse = await context.client.getLoginHistory({ accessToken: context.session.accessToken })

    if (upstreamResponse.status !== 200 || !upstreamResponse.data) {
      return createUpstreamErrorResponse("login-history", upstreamResponse)
    }

    return createSettingsResponse({ history: upstreamResponse.data })
  })
}
