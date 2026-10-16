import { createUpstreamErrorResponse } from "@/lib/server/auth-bff-route"
import {
  createSettingsResponse,
  withAuthenticatedSettingsRoute,
} from "@/lib/server/settings-bff-route"
import type { NextRequest } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TwoFactorAuthenticationStatusSchema = z.object({
  enabled: z.boolean(),
  method: z.enum(["EMAIL", "TOTP"]).nullable(),
  recoveryCodesRemaining: z.number().int().nonnegative(),
}).strict()

export async function POST(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "mfa-status",
    body: "none",
    method: "POST",
  }, async (context) => {
    const upstreamResponse = await context.client.getMfaStatus({ accessToken: context.session.accessToken })
    const status = upstreamResponse.status === 200
      ? TwoFactorAuthenticationStatusSchema.safeParse(upstreamResponse.data)
      : undefined

    if (!status?.success) {
      return createUpstreamErrorResponse("mfa-status", upstreamResponse)
    }

    return createSettingsResponse(status.data)
  })
}
