import { createAuthenticationApiClient } from "@/lib/server/authentication-api"
import { getOAuthServerEnvironment } from "@/lib/server/environment"
import type { OAuthTransactionSecret } from "@/lib/server/environment"
import { createOAuthAuthorizationResumePath } from "@/lib/server/oauth-authorization-flow"
import {
  OAuthConsentDecisionRequestError,
  parseOAuthConsentDecisionRequest,
  processOAuthConsentDecision,
  type OAuthConsentDecisionOutcome,
} from "@/lib/server/oauth-consent-decision"
import {
  clearOAuthTransactionCookie,
  isOAuthTransactionBoundToSubject,
  markOAuthTransactionApproved,
  readOAuthTransaction,
  type OAuthTransaction,
} from "@/lib/server/oauth-transaction"
import {
  clearSessionCookies,
  type SessionCookieOptions,
  type SessionCookieStore,
} from "@/lib/server/session-cookies"
import {
  assertTrustedMutationRequest,
  readBoundedRequestBody,
  RequestSecurityError,
} from "@/lib/server/request-security"
import { resolveServerSession } from "@/lib/server/session"
import { type NextRequest, NextResponse } from "next/server"

type PendingCookie = {
  name: string
  options: SessionCookieOptions
  value: string
}

const MAX_CONSENT_BODY_BYTES = 256
const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  vary: "Origin, Sec-Fetch-Site",
  "x-content-type-options": "nosniff",
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const pendingCookies: PendingCookie[] = []
  const cookieWriter: Pick<SessionCookieStore, "set"> = {
    set(name, value, options) {
      pendingCookies.push({ name, options, value })
    },
  }

  try {
    const environment = getOAuthServerEnvironment()
    await assertTrustedMutationRequest(request, environment.appOrigin, {
      body: "application/x-www-form-urlencoded",
      method: "POST",
    })

    const rawBody = await readConsentBody(request)
    const consentRequest = parseOAuthConsentDecisionRequest(rawBody)
    const transactionResult = readOAuthTransaction(request.cookies, {
      expectedTransactionId: consentRequest.transactionId,
      secret: environment.oauthTransactionSecret,
    })

    if (transactionResult.status !== "valid") {
      if (transactionResult.status === "expired" || transactionResult.status === "invalid") {
        clearOAuthTransactionCookie(cookieWriter)
      }

      return createJsonResponse({ error: "invalid_request" }, 400, pendingCookies)
    }

    const transaction = transactionResult.transaction

    if (transaction.phase !== "consent" && transaction.phase !== "approved") {
      return createJsonResponse({ error: "invalid_request" }, 400, pendingCookies)
    }

    if (consentRequest.decision === "deny") {
      const outcome = await processOAuthConsentDecision({
        decision: "deny",
        transaction,
      })

      return respondToConsentOutcome(
        outcome,
        transaction,
        environment.appOrigin,
        environment.oauthTransactionSecret,
        cookieWriter,
        pendingCookies
      )
    }

    const client = createAuthenticationApiClient(environment)
    const session = await resolveServerSession({
      client,
      cookieReader: request.cookies,
      cookieWriter,
    })

    if (session.state === "anonymous" || session.state === "refresh-required") {
      return applyPendingCookies(
        createLoginRedirect(environment.appOrigin, transaction.id),
        pendingCookies
      )
    }

    if (session.state === "unavailable") {
      return createJsonResponse({ error: "temporarily_unavailable" }, 503, pendingCookies)
    }

    if (!isOAuthTransactionBoundToSubject(transaction, session.user.id)) {
      return applyPendingCookies(
        createRedirectResponse(
          new URL(createOAuthAuthorizationResumePath(transaction.id), environment.appOrigin)
        ),
        pendingCookies
      )
    }

    const outcome = await processOAuthConsentDecision({
      accessToken: session.accessToken,
      client,
      decision: "allow",
      subjectId: session.user.id,
      transaction,
    })

    return respondToConsentOutcome(
      outcome,
      transaction,
      environment.appOrigin,
      environment.oauthTransactionSecret,
      cookieWriter,
      pendingCookies
    )
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      return createJsonResponse({ error: "invalid_request" }, error.status, pendingCookies)
    }

    if (error instanceof OAuthConsentDecisionRequestError) {
      return createJsonResponse({ error: "invalid_request" }, 400, pendingCookies)
    }

    console.error("OAuth consent decision failed", {
      failureType: error instanceof Error ? error.name : "UnknownError",
    })

    return createJsonResponse({ error: "temporarily_unavailable" }, 503, pendingCookies)
  }
}

function respondToConsentOutcome(
  outcome: OAuthConsentDecisionOutcome,
  transaction: OAuthTransaction,
  appOrigin: string,
  transactionSecret: OAuthTransactionSecret,
  cookieWriter: Pick<SessionCookieStore, "set">,
  pendingCookies: PendingCookie[]
): NextResponse {
  if (outcome.state === "redirect") {
    clearOAuthTransactionCookie(cookieWriter)
    return applyPendingCookies(createRedirectResponse(outcome.location), pendingCookies)
  }

  if (outcome.state === "terminal-error") {
    console.error("OAuth consent decision reached a terminal error", {
      reason: outcome.reason,
    })
    clearOAuthTransactionCookie(cookieWriter)
    return createJsonResponse({ error: "server_error" }, 502, pendingCookies)
  }

  if (outcome.consentRecorded) {
    markOAuthTransactionApproved(cookieWriter, transaction, {
      secret: transactionSecret,
    })
  }

  if (outcome.state === "reauthenticate") {
    clearSessionCookies(cookieWriter)
    return applyPendingCookies(
      createLoginRedirect(appOrigin, transaction.id),
      pendingCookies
    )
  }

  return createJsonResponse({ error: "temporarily_unavailable" }, 503, pendingCookies)
}

async function readConsentBody(request: NextRequest): Promise<string> {
  try {
    const body = await readBoundedRequestBody(request, MAX_CONSENT_BODY_BYTES)
    return new TextDecoder("utf-8", { fatal: true }).decode(body)
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      throw error
    }

    throw new OAuthConsentDecisionRequestError()
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

function createJsonResponse(
  body: { error: string },
  status: number,
  pendingCookies: PendingCookie[]
): NextResponse {
  return applyPendingCookies(
    NextResponse.json(body, { headers: NO_STORE_HEADERS, status }),
    pendingCookies
  )
}

function applyPendingCookies(response: NextResponse, pendingCookies: PendingCookie[]): NextResponse {
  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }

  return response
}
