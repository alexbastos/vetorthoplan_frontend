import {
  createInvalidRequestResponse,
  createSuccessResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  getAuthenticationRouteClient,
  parseJsonBody,
  VerifyEmailRequestSchema,
} from "@/lib/server/auth-bff-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const client = await getAuthenticationRouteClient(request)
    const input = await parseJsonBody(request, VerifyEmailRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await client.verifyEmail(input)

    if (upstreamResponse.status !== 200) {
      return createUpstreamErrorResponse("verify-email", upstreamResponse)
    }

    return createSuccessResponse()
  } catch (error) {
    return createUnexpectedRouteErrorResponse("verify-email", error)
  }
}
