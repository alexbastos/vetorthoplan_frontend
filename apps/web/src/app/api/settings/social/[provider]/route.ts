import {
  createInvalidRequestResponse,
  createSuccessResponse,
  createUpstreamErrorResponse,
} from "@/lib/server/auth-bff-route"
import { withAuthenticatedSettingsRoute } from "@/lib/server/settings-bff-route"
import type { NextRequest } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const SocialProviderSchema = z.enum(["GOOGLE", "APPLE", "FACEBOOK", "GITHUB"])

type RouteContext = { params: Promise<{ provider: string }> }

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return withAuthenticatedSettingsRoute(request, {
    action: "unlink-social-account",
    body: "none",
    method: "DELETE",
  }, async (context) => {
    const provider = SocialProviderSchema.safeParse((await params).provider)

    if (!provider.success) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await context.client.unlinkSocialAccount(provider.data, {
      accessToken: context.session.accessToken,
    })

    if (upstreamResponse.status !== 200) {
      return createUpstreamErrorResponse("unlink-social-account", upstreamResponse)
    }

    return createSuccessResponse()
  })
}
