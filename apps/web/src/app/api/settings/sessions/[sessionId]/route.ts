import {
  createInvalidRequestResponse,
  createSuccessResponse,
  createUpstreamErrorResponse,
  RouteIdentifierSchema,
} from "@/lib/server/auth-bff-route"
import { withAuthenticatedSettingsRoute } from "@/lib/server/settings-bff-route"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type RouteContext = { params: Promise<{ sessionId: string }> }

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return withAuthenticatedSettingsRoute(request, {
    action: "revoke-session",
    body: "none",
    method: "DELETE",
  }, async (context) => {
    const sessionId = RouteIdentifierSchema.safeParse((await params).sessionId)

    if (!sessionId.success) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await context.client.revokeActiveSession(sessionId.data, {
      accessToken: context.session.accessToken,
    })

    if (upstreamResponse.status !== 204 && upstreamResponse.status !== 404) {
      return createUpstreamErrorResponse("revoke-session", upstreamResponse)
    }

    return createSuccessResponse()
  })
}
