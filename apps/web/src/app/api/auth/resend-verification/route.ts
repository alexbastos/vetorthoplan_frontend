import {
  createInvalidRequestResponse,
  createSuccessResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  getAuthenticationRouteClient,
  parseJsonBody,
  ResendVerificationRequestSchema,
} from "@/lib/server/auth-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const client = await getAuthenticationRouteClient(request)
    const input = await parseJsonBody(request, ResendVerificationRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await client.resendVerification(input)

    if (upstreamResponse.status !== 200) {
      return createUpstreamErrorResponse("resend-verification", upstreamResponse)
    }

    return createSuccessResponse()
  } catch (error) {
    return createUnexpectedRouteErrorResponse("resend-verification", error)
  }
}
