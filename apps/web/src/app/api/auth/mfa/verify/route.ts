import {
  createInvalidRequestResponse,
  createNoStoreJsonResponse,
  createUnexpectedRouteErrorResponse,
  createUpstreamErrorResponse,
  getAuthenticationRouteClient,
  MfaVerifyRequestSchema,
  parseJsonBody,
} from "@/lib/server/auth-bff-route"
import { parseAuthenticationOutcome } from "@/lib/server/login-authentication"
import { getSessionServerEnvironment } from "@/lib/server/environment"
import { synchronizeRegionalPreferenceCookies } from "@/lib/server/regional-preference"
import { setSessionCookies } from "@/lib/server/session-cookies"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const environment = getSessionServerEnvironment()
    const client = await getAuthenticationRouteClient(request)
    const input = await parseJsonBody(request, MfaVerifyRequestSchema)

    if (!input) {
      return createInvalidRequestResponse()
    }

    const upstreamResponse = await client.verifyMfa({
      code: input.code,
      method: input.method,
      mfaToken: input.challengeToken,
    })
    const outcome = upstreamResponse.status === 200 ? parseAuthenticationOutcome(upstreamResponse.data) : undefined

    if (!outcome || outcome.type !== "authenticated") {
      return createUpstreamErrorResponse("mfa-verify", upstreamResponse)
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
    return createUnexpectedRouteErrorResponse("mfa-verify", error)
  }
}
