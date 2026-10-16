import {
  createInvalidRequestResponse,
  createNoStoreJsonResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  getAuthenticationRouteClient,
  parseJsonBody,
  SocialLoginRequestSchema,
} from "@/lib/server/auth-bff-route"
import { parseAuthenticationOutcome } from "@/lib/server/login-authentication"
import { getSessionServerEnvironment } from "@/lib/server/environment"
import { setSessionCookies } from "@/lib/server/session-cookies"
import { synchronizeRegionalPreferenceCookies } from "@/lib/server/regional-preference"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const environment = getSessionServerEnvironment()
    const client = await getAuthenticationRouteClient(request)
    const input = await parseJsonBody(request, SocialLoginRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await client.socialLogin(input)
    const outcome = upstreamResponse.status === 200 ? parseAuthenticationOutcome(upstreamResponse.data) : undefined

    if (!outcome) {
      return createUpstreamErrorResponse("social-login", upstreamResponse)
    }

    if (outcome.type === "mfa_required") {
      return createNoStoreJsonResponse(outcome)
    }

    const response = createNoStoreJsonResponse({ type: "authenticated" as const })
    setSessionCookies(response.cookies, outcome.tokens, {
      secrets: environment.sessionCookieSecrets,
    })
    await synchronizeRegionalPreferenceCookies({
      accessToken: outcome.tokens.accessToken,
      client,
      cookieWriter: response.cookies,
    })

    return response
  } catch (error) {
    return createUnexpectedRouteErrorResponse("social-login", error)
  }
}
