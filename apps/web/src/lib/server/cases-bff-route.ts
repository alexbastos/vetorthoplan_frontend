import "server-only"

import { NextResponse, type NextRequest } from "next/server"

import { createUnauthenticatedResponse, getForwardedClientMetadata } from "./auth-bff-route"
import { createAuthenticationApiClient } from "./authentication-api"
import { getClinicalServerEnvironment, getServerEnvironment, getSessionServerEnvironment } from "./environment"
import { createClinicalApiClient } from "./clinical-api"
import { createClinicalIdentityCookies } from "./clinical-identity-cookies"
import { ClinicalIdentityError, resolveClinicalIdentity } from "./clinical-identity"
import { assertTrustedMutationRequest, RequestSecurityError, type MutationRequestPolicy } from "./request-security"
import { resolveServerSession, type AuthenticatedServerSession } from "./session"
import type { SessionCookieOptions, SessionCookieStore } from "./session-cookies"

type PendingCookie = {
  name: string
  options: SessionCookieOptions
  value: string
}

type CookieWriter = Pick<SessionCookieStore, "set">
type CasesSessionHandler = (session: AuthenticatedServerSession, cookies: CookieWriter) => NextResponse | Promise<NextResponse>
type CasesRouteHandler = (session: AuthenticatedServerSession, client: ReturnType<typeof createClinicalApiClient>) => NextResponse | Promise<NextResponse>

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  vary: "Cookie, Origin, Sec-Fetch-Site",
  "x-content-type-options": "nosniff",
}

async function withAuthenticatedCasesRoute(
  request: NextRequest,
  handler: CasesRouteHandler,
  mutationPolicy?: MutationRequestPolicy,
): Promise<NextResponse> {
  return withAuthenticatedCasesSession(request, async (session, writer) => {
    const environment = getClinicalServerEnvironment()
    if (environment.identityMode === "local") return handler(session, createClinicalApiClient())
    const cookies = clinicalCookiesForRequest(request, writer)
    let expectedOrganizationId: string | undefined
    try { expectedOrganizationId = request.headers.has("x-clinical-organization") ? decodeURIComponent(request.headers.get("x-clinical-organization")!) : undefined }
    catch { throw new ClinicalIdentityError(400, "VALIDATION_ERROR") }
    const identity = await resolveClinicalIdentity({ ownerId: session.user.id, accessToken: session.accessToken,
      authOrigin: getServerEnvironment().authenticationApiBaseUrl, cookies, signal: request.signal,
      expectedOrganizationId, requireExpectedOrganization: true })
    if (identity.state !== "ready") return createCasesResponse({ error: { code: "CLINICAL_ORGANIZATION_REQUIRED", retryable: false } }, identity.state === "no_organizations" ? 403 : 409)
    let rejected: 401 | 403 | undefined
    const client = createClinicalApiClient({ accessToken: identity.accessToken, onAccessRejected: status => { rejected = status; cookies.clearAccess() } })
    const response = await handler(session, client)
    // Never replay a clinical mutation after 401/403. A later explicit attempt
    // resolves the general session and re-exchanges the scoped token.
    return rejected ? createCasesResponse({ error: { code: rejected === 401 ? "SESSION_UNAVAILABLE" : "ACCESS_DENIED", retryable: false } }, rejected) : response
  }, mutationPolicy)
}

function clinicalCookiesForRequest(request: NextRequest, writer: CookieWriter) {
  const environment = getSessionServerEnvironment()
  return createClinicalIdentityCookies(request.cookies, writer, { secrets: environment.sessionCookieSecrets,
    authOrigin: environment.authenticationApiBaseUrl, clinicalOrigin: getClinicalServerEnvironment().clinicalApiBaseUrl,
    production: process.env.NODE_ENV === "production" })
}

async function withAuthenticatedCasesSession(request: NextRequest, handler: CasesSessionHandler, mutationPolicy?: MutationRequestPolicy): Promise<NextResponse> {
  const pendingCookies: PendingCookie[] = []
  let response: NextResponse
  const writer: CookieWriter = { set(name, value, options) { pendingCookies.push({ name, options, value }) } }

  try {
    const environment = getServerEnvironment()
    if (mutationPolicy) {
      await assertTrustedMutationRequest(request, environment.appOrigin, mutationPolicy)
    }
    const authClient = createAuthenticationApiClient(environment)
    const session = await resolveServerSession({
      client: authClient,
      cookieReader: request.cookies,
      refreshRequestOptions: { headers: getForwardedClientMetadata(request) },
      cookieWriter: writer,
    })

    if (session.state === "unavailable") {
      response = createCasesResponse({ error: { code: "SERVICE_UNAVAILABLE", retryable: true } }, 503)
    } else if (session.state !== "authenticated") {
      response = createUnauthenticatedResponse()
    } else {
      response = await handler(session, writer)
    }
  } catch (error) {
    response = error instanceof ClinicalIdentityError
      ? createCasesResponse({ error: { code: error.code, retryable: error.status === 429 || error.status === 503 } }, error.status)
      : error instanceof RequestSecurityError
      ? createCasesResponse({ error: { code: "REQUEST_NOT_ALLOWED", retryable: false } }, error.status)
      : createCasesResponse({ error: { code: "SERVICE_UNAVAILABLE", retryable: true } }, 503)
  }

  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }

  return response
}

function createCasesResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { headers: NO_STORE_HEADERS, status })
}

function createEmptyCasesResponse(): NextResponse {
  return new NextResponse(null, { headers: NO_STORE_HEADERS, status: 204 })
}

export { clinicalCookiesForRequest, createCasesResponse, createEmptyCasesResponse, withAuthenticatedCasesRoute, withAuthenticatedCasesSession }
