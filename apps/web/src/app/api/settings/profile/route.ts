import type { NextRequest } from "next/server"

import { parseSettingsUserResponse } from "@/features/settings/schemas/profile-response.schema"
import {
  createInvalidRequestResponse,
  createUpstreamErrorResponse,
  parseJsonBody,
  UpdateProfileRequestSchema,
} from "@/lib/server/auth-bff-route"
import { createSettingsResponse, withAuthenticatedSettingsRoute } from "@/lib/server/settings-bff-route"
import { setRegionalPreferenceCookies } from "@/lib/server/regional-preference"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "session",
    body: "none",
    method: "POST",
  }, (context) => {
    const user = parseSettingsUserResponse(context.session.user)

    if (!user) {
      throw new Error("Authentication API returned an invalid profile response")
    }

    return createSettingsResponse({ user })
  })
}

export async function PUT(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "update-profile",
    body: "application/json",
    method: "PUT",
  }, async (context) => {
    const input = await parseJsonBody(request, UpdateProfileRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await context.client.updateCurrentUser(context.session.user.id, input, {
      accessToken: context.session.accessToken,
    })

    if (upstreamResponse.status !== 200) {
      return createUpstreamErrorResponse("update-profile", upstreamResponse)
    }

    const user = parseSettingsUserResponse(upstreamResponse.data)

    if (!user) {
      return createUpstreamErrorResponse("update-profile", upstreamResponse)
    }

    const response = createSettingsResponse({ user })
    setRegionalPreferenceCookies(response.cookies, user.profile)

    return response
  })
}
