import {
  createInvalidRequestResponse,
  createSuccessResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  getAuthenticationRouteClient,
  parseJsonBody,
  RegisterRequestSchema,
} from "@/lib/server/auth-bff-route"
import {
  PENDING_VERIFICATION_EMAIL_COOKIE_NAME,
  PENDING_VERIFICATION_EMAIL_MAX_AGE_SECONDS,
} from "@/lib/auth-constants"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const client = await getAuthenticationRouteClient(request)
    const input = await parseJsonBody(request, RegisterRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await client.register(input)

    if (upstreamResponse.status !== 201) {
      return createUpstreamErrorResponse("register", upstreamResponse)
    }

    const response = createSuccessResponse(201)

    response.cookies.set(PENDING_VERIFICATION_EMAIL_COOKIE_NAME, input.email, {
      httpOnly: true,
      maxAge: PENDING_VERIFICATION_EMAIL_MAX_AGE_SECONDS,
      path: "/register/check-email",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    return response
  } catch (error) {
    return createUnexpectedRouteErrorResponse("register", error)
  }
}
