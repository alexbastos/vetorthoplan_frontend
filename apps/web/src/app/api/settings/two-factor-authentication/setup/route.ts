import {
  createUpstreamErrorResponse,
} from "@/lib/server/auth-bff-route"
import {
  createSettingsResponse,
  withAuthenticatedSettingsRoute,
} from "@/lib/server/settings-bff-route"
import type { NextRequest } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TotpSetupResponseSchema = z.object({
  message: z.string().min(1).max(1_024),
  method: z.literal("TOTP"),
  qrCodeUrl: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/).max(1_000_000),
  secret: z.string().min(1).max(1_024),
}).strict()

export async function POST(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "mfa-setup",
    body: "none",
    method: "POST",
  }, async (context) => {
    const upstreamResponse = await context.client.setupMfa({ method: "TOTP" }, { accessToken: context.session.accessToken })
    const setup = upstreamResponse.status === 200
      ? TotpSetupResponseSchema.safeParse(upstreamResponse.data)
      : undefined

    if (!setup?.success) {
      return createUpstreamErrorResponse("mfa-setup", upstreamResponse)
    }

    return createSettingsResponse({ qrCodeUrl: setup.data.qrCodeUrl })
  })
}
