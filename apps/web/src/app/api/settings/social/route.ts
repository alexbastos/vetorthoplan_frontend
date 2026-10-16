import {
  createInvalidRequestResponse,
  createUpstreamErrorResponse,
  LinkSocialAccountRequestSchema,
  parseJsonBody,
} from "@/lib/server/auth-bff-route"
import { createSettingsResponse, withAuthenticatedSettingsRoute } from "@/lib/server/settings-bff-route"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "link-social-account",
    body: "application/json",
    method: "POST",
  }, async (context) => {
    const input = await parseJsonBody(request, LinkSocialAccountRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await context.client.linkSocialAccount(input, { accessToken: context.session.accessToken })

    if (upstreamResponse.status !== 200) {
      return createUpstreamErrorResponse("link-social-account", upstreamResponse)
    }

    return createSettingsResponse({ success: true })
  })
}
