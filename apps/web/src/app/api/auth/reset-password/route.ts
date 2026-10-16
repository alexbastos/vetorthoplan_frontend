import {
  createInvalidRequestResponse,
  createSuccessResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  getAuthenticationRouteClient,
  parseJsonBody,
  ResetPasswordRequestSchema,
} from "@/lib/server/auth-bff-route"
import { clearSessionCookies } from "@/lib/server/session-cookies"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const client = await getAuthenticationRouteClient(request)
    const input = await parseJsonBody(request, ResetPasswordRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await client.resetPassword(input)

    if (upstreamResponse.status !== 200) {
      return createUpstreamErrorResponse("reset-password", upstreamResponse)
    }

    const response = createSuccessResponse()
    clearSessionCookies(response.cookies)
    return response
  } catch (error) {
    return createUnexpectedRouteErrorResponse("reset-password", error)
  }
}
