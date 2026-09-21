import {
  createInvalidRequestResponse,
  createUpstreamErrorResponse,
  parseJsonBody,
} from "@/lib/server/auth-bff-route"
import {
  createSettingsResponse,
  withAuthenticatedSettingsRoute,
} from "@/lib/server/settings-bff-route"
import type { NextRequest } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TotpVerificationRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
}).strict()

const TotpVerificationResponseSchema = z.object({
  message: z.string().min(1).max(1_024),
  recoveryCodes: z.array(z.string().regex(/^[0-9A-F]{8}-[0-9A-F]{8}$/)).length(10),
}).strict()

export async function POST(request: NextRequest) {
  return withAuthenticatedSettingsRoute(request, {
    action: "mfa-verify-setup",
    body: "application/json",
    method: "POST",
  }, async (context) => {
    const input = await parseJsonBody(request, TotpVerificationRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await context.client.verifyMfaSetup(input, { accessToken: context.session.accessToken })
    const verification = upstreamResponse.status === 200
      ? TotpVerificationResponseSchema.safeParse(upstreamResponse.data)
      : undefined

    if (!verification?.success) {
      return createUpstreamErrorResponse("mfa-verify-setup", upstreamResponse)
    }

    return createSettingsResponse({ recoveryCodes: verification.data.recoveryCodes })
  })
}
