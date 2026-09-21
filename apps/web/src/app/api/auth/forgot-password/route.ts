import {
  createInvalidRequestResponse,
  createSuccessResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  ForgotPasswordRequestSchema,
  getAuthenticationRouteClient,
  logAuthenticationFailure,
  parseJsonBody,
} from "@/lib/server/auth-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const client = await getAuthenticationRouteClient(request)
    const input = await parseJsonBody(request, ForgotPasswordRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await client.forgotPassword(input)

    if (upstreamResponse.status === 429 || upstreamResponse.status >= 500) {
      return createUpstreamErrorResponse("forgot-password", upstreamResponse)
    }

    if (upstreamResponse.status !== 200) {
      logAuthenticationFailure("forgot-password", upstreamResponse)
    }

    // Preserve the upstream anti-enumeration contract for every non-operational response.
    return createSuccessResponse()
  } catch (error) {
    return createUnexpectedRouteErrorResponse("forgot-password", error)
  }
}
