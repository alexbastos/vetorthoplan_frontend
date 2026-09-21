import {
  ChangePasswordRequestSchema,
  createInvalidRequestResponse,
  createSuccessResponse,
  createUpstreamErrorResponse,
  parseJsonBody,
} from "@/lib/server/auth-bff-route"
import { withAuthenticatedSettingsRoute } from "@/lib/server/settings-bff-route"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function PUT(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "change-password",
    body: "application/json",
    method: "PUT",
  }, async (context) => {
    const input = await parseJsonBody(request, ChangePasswordRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await context.client.changePassword(input, { accessToken: context.session.accessToken })

    if (upstreamResponse.status !== 200) {
      return createUpstreamErrorResponse("change-password", upstreamResponse)
    }

    return createSuccessResponse()
  })
}
