import "server-only"

import type { AuthenticationApiClient } from "@capta/api-client"
import { NextResponse, type NextRequest } from "next/server"

import {
  createUnauthenticatedResponse,
  createUnexpectedRouteErrorResponse,
  getForwardedClientMetadata,
} from "./auth-bff-route"
import { createAuthenticationApiClient } from "./authentication-api"
import { getServerEnvironment } from "./environment"
import {
  assertTrustedMutationRequest,
  type MutationRequestPolicy,
} from "./request-security"
import { resolveServerSession, type AuthenticatedServerSession } from "./session"
import type { SessionCookieOptions } from "./session-cookies"

type PendingCookie = {
  name: string
  options: SessionCookieOptions
  value: string
}

type SettingsRouteContext = {
  client: AuthenticationApiClient
  session: AuthenticatedServerSession
}

type SettingsRouteAction = Parameters<typeof createUnexpectedRouteErrorResponse>[0]
type SettingsRouteHandler = (context: SettingsRouteContext) => NextResponse | Promise<NextResponse>
type SettingsRouteOptions = MutationRequestPolicy & {
  action: SettingsRouteAction
}

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  vary: "Origin, Sec-Fetch-Site",
  "x-content-type-options": "nosniff",
}

async function withAuthenticatedSettingsRoute(
  request: NextRequest,
  options: SettingsRouteOptions,
  handler: SettingsRouteHandler,
): Promise<NextResponse> {
  const pendingCookies: PendingCookie[] = []
  let response: NextResponse

  try {
    const environment = getServerEnvironment()
    await assertTrustedMutationRequest(request, environment.appOrigin, options)

    const client = createAuthenticationApiClient(environment)
    const session = await resolveServerSession({
      client,
      cookieReader: request.cookies,
      refreshRequestOptions: { headers: getForwardedClientMetadata(request) },
      cookieWriter: {
        set(name, value, options) {
          pendingCookies.push({ name, options, value })
        },
      },
    })

    if (session.state === "unavailable") {
      response = createSettingsResponse({
        error: {
          code: "SERVICE_UNAVAILABLE",
          retryable: true,
        },
      }, 503)
    } else if (session.state !== "authenticated") {
      response = createUnauthenticatedResponse()
    } else {
      response = await handler({ client, session })
    }
  } catch (error) {
    response = createUnexpectedRouteErrorResponse(options.action, error)
  }

  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }

  return response
}

function createSettingsResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { headers: NO_STORE_HEADERS, status })
}

export { createSettingsResponse, withAuthenticatedSettingsRoute }
