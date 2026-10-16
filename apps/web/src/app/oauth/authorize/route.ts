import { createAuthenticationApiClient } from "@/lib/server/authentication-api"
import { getOAuthServerEnvironment } from "@/lib/server/environment"
import {
  createOAuthAuthorizationResumePath,
  createOAuthConsentPath,
  OAuthAuthorizationContinuationError,
  OAuthAuthorizationRequestError,
  prepareOAuthAuthorizationFlow,
} from "@/lib/server/oauth-authorization-flow"
import {
  createOAuthAuthorizationErrorRedirect,
  interpretOAuthAuthorizationResponse,
} from "@/lib/server/oauth-authorization-response"
import {
  getOAuthAuthorizationRequestForUpstream,
  getRequestedPrompts,
  requiresOAuthAuthenticationPrompt,
} from "@/lib/server/oauth-authorization-request"
import {
  clearOAuthTransactionCookie,
  markOAuthTransactionAuthenticationRequired,
  markOAuthTransactionConsentRequired,
} from "@/lib/server/oauth-transaction"
import {
  clearSessionCookies,
  type SessionCookieOptions,
  type SessionCookieStore,
} from "@/lib/server/session-cookies"
import {
  assertDocumentNavigationRequest,
  RequestSecurityError,
} from "@/lib/server/request-security"
import { type NextRequest, NextResponse } from "next/server"

type PendingCookie = {
  name: string
  options: SessionCookieOptions
  value: string
}

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  vary: "Sec-Fetch-Dest, Sec-Fetch-Mode",
  "x-content-type-options": "nosniff",
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const pendingCookies: PendingCookie[] = []

  try {
    assertDocumentNavigationRequest(request)

    const environment = getOAuthServerEnvironment()
    const client = createAuthenticationApiClient(environment)
    const cookieWriter: Pick<SessionCookieStore, "set"> = {
      set(name, value, options) {
        pendingCookies.push({ name, options, value })
      },
    }
    const flow = await prepareOAuthAuthorizationFlow({
      client,
      cookieReader: request.cookies,
      cookieWriter,
      rawQuery: request.nextUrl.search,
      transactionSecret: environment.oauthTransactionSecret,
    })

    if (flow.state === "login-required") {
      return applyPendingCookies(
        createLoginRedirect(environment.appOrigin, flow.transaction.id),
        pendingCookies
      )
    }

    if (flow.state === "non-interactive-login-required") {
      clearOAuthTransactionCookie(cookieWriter)
      return applyPendingCookies(
        createOAuthErrorResponse("login_required", 401),
        pendingCookies
      )
    }

    if (flow.state === "unavailable") {
      return applyPendingCookies(createUnavailableResponse(), pendingCookies)
    }

    const upstreamResponse = await client.authorize(
      getOAuthAuthorizationRequestForUpstream(
        flow.transaction.request,
        flow.transaction.authenticationPromptSatisfied
      ),
      { accessToken: flow.session.accessToken }
    )
    const decision = interpretOAuthAuthorizationResponse(upstreamResponse, flow.transaction)

    if (
      !flow.transaction.authenticationPromptSatisfied &&
      requiresOAuthAuthenticationPrompt(flow.transaction.request) &&
      (decision.state === "redirect" || decision.state === "consent-required")
    ) {
      const authenticationTransaction = markOAuthTransactionAuthenticationRequired(
        cookieWriter,
        flow.transaction,
        { secret: environment.oauthTransactionSecret }
      )
      clearSessionCookies(cookieWriter)

      return applyPendingCookies(
        createLoginRedirect(environment.appOrigin, authenticationTransaction.id),
        pendingCookies
      )
    }

    if (decision.state === "redirect") {
      clearOAuthTransactionCookie(cookieWriter)
      return applyPendingCookies(createRedirectResponse(decision.location), pendingCookies)
    }

    if (decision.state === "consent-required") {
      if (getRequestedPrompts(flow.transaction.request).includes("none")) {
        const location = createOAuthAuthorizationErrorRedirect(
          flow.transaction,
          "consent_required"
        )
        clearOAuthTransactionCookie(cookieWriter)

        return applyPendingCookies(
          location ? createRedirectResponse(location) : createInvalidUpstreamResponse(),
          pendingCookies
        )
      }

      if (flow.transaction.phase === "approved") {
        clearOAuthTransactionCookie(cookieWriter)
        return applyPendingCookies(createInvalidUpstreamResponse(), pendingCookies)
      }

      const consentTransaction = markOAuthTransactionConsentRequired(
        cookieWriter,
        flow.transaction,
        flow.session.user.id,
        { secret: environment.oauthTransactionSecret }
      )
      const consentUrl = new URL(
        createOAuthConsentPath(consentTransaction.id),
        environment.appOrigin
      )

      return applyPendingCookies(createRedirectResponse(consentUrl), pendingCookies)
    }

    if (decision.state === "reauthenticate") {
      clearSessionCookies(cookieWriter)

      if (getRequestedPrompts(flow.transaction.request).includes("none")) {
        clearOAuthTransactionCookie(cookieWriter)
        return applyPendingCookies(
          createOAuthErrorResponse("login_required", 401),
          pendingCookies
        )
      }

      const authenticationTransaction = markOAuthTransactionAuthenticationRequired(
        cookieWriter,
        flow.transaction,
        { secret: environment.oauthTransactionSecret }
      )
      return applyPendingCookies(
        createLoginRedirect(environment.appOrigin, authenticationTransaction.id),
        pendingCookies
      )
    }

    if (decision.state === "upstream-unavailable") {
      return applyPendingCookies(createUnavailableResponse(), pendingCookies)
    }

    console.error("Authentication API returned an invalid OAuth authorization response", {
      reason: decision.reason,
      upstreamRequestId: upstreamResponse.headers.get("x-request-id") ?? undefined,
      upstreamStatus: upstreamResponse.status,
    })

    clearOAuthTransactionCookie(cookieWriter)
    return applyPendingCookies(createInvalidUpstreamResponse(), pendingCookies)
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      return applyPendingCookies(
        NextResponse.json(
          { error: "invalid_request" },
          { headers: NO_STORE_HEADERS, status: error.status }
        ),
        pendingCookies
      )
    }

    if (
      error instanceof OAuthAuthorizationRequestError ||
      error instanceof OAuthAuthorizationContinuationError
    ) {
      return applyPendingCookies(
        NextResponse.json(
          { error: "invalid_request" },
          { headers: NO_STORE_HEADERS, status: 400 }
        ),
        pendingCookies
      )
    }

    console.error("OAuth authorization entry failed", {
      failureType: error instanceof Error ? error.name : "UnknownError",
    })

    return applyPendingCookies(createUnavailableResponse(), pendingCookies)
  }
}

function createLoginRedirect(appOrigin: string, transactionId: string): NextResponse {
  const loginUrl = new URL("/login", appOrigin)
  loginUrl.searchParams.set("from", createOAuthAuthorizationResumePath(transactionId))

  return createRedirectResponse(loginUrl)
}

function createRedirectResponse(location: string | URL): NextResponse {
  return new NextResponse(null, {
    headers: {
      ...NO_STORE_HEADERS,
      location: location.toString(),
    },
    status: 302,
  })
}

function createUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: "temporarily_unavailable" },
    { headers: NO_STORE_HEADERS, status: 503 }
  )
}

function createInvalidUpstreamResponse(): NextResponse {
  return NextResponse.json(
    { error: "server_error" },
    { headers: NO_STORE_HEADERS, status: 502 }
  )
}

function createOAuthErrorResponse(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { headers: NO_STORE_HEADERS, status })
}

function applyPendingCookies(response: NextResponse, pendingCookies: PendingCookie[]): NextResponse {
  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }

  return response
}
