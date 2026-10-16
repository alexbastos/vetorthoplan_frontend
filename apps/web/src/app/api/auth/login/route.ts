import {
  createInvalidRequestResponse,
  createNoStoreJsonResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  getAuthenticationRouteClient,
  LoginRequestSchema,
  parseJsonBody,
} from "@/lib/server/auth-bff-route"
import { setSessionCookies } from "@/lib/server/session-cookies"
import { synchronizeRegionalPreferenceCookies } from "@/lib/server/regional-preference"
import { parseAuthenticationOutcome } from "@/lib/server/login-authentication"
import { getSessionServerEnvironment } from "@/lib/server/environment"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const environment = getSessionServerEnvironment()
    const client = await getAuthenticationRouteClient(request)
    const input = await parseJsonBody(request, LoginRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await client.login(input)
    const outcome = upstreamResponse.status === 200 ? parseAuthenticationOutcome(upstreamResponse.data) : undefined

    if (!outcome) {
      return createUpstreamErrorResponse("login", upstreamResponse)
    }

    if (outcome.type === "mfa_required") {
      return createNoStoreJsonResponse(outcome)
    }

    const response = createNoStoreJsonResponse({ type: "authenticated" as const })
    setSessionCookies(response.cookies, outcome.tokens, {
      secrets: environment.sessionCookieSecrets,
    })
    await synchronizeRegionalPreferenceCookies({ accessToken: outcome.tokens.accessToken, client, cookieWriter: response.cookies })

    return response
  } catch (error) {
    return createUnexpectedRouteErrorResponse("login", error)
  }
}
