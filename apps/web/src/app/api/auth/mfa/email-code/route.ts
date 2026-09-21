import {
  createInvalidRequestResponse,
  createSuccessResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  getAuthenticationRouteClient,
  MfaEmailCodeRequestSchema,
  parseJsonBody,
} from "@/lib/server/auth-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const client = await getAuthenticationRouteClient(request)
    const input = await parseJsonBody(request, MfaEmailCodeRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await client.sendMfaEmailCode({ mfaToken: input.challengeToken })

    if (upstreamResponse.status !== 200) {
      return createUpstreamErrorResponse("mfa-email-code", upstreamResponse)
    }

    return createSuccessResponse()
  } catch (error) {
    return createUnexpectedRouteErrorResponse("mfa-email-code", error)
  }
}
