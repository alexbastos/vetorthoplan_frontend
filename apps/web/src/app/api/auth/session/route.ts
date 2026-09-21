import { createAuthenticationApiClient } from "@/lib/server/authentication-api"
import { getForwardedClientMetadata } from "@/lib/server/auth-bff-route"
import { getServerEnvironment } from "@/lib/server/environment"
import {
  assertTrustedMutationRequest,
  RequestSecurityError,
} from "@/lib/server/request-security"
import { resolveServerSession } from "@/lib/server/session"
import { setRegionalPreferenceCookies } from "@/lib/server/regional-preference"
import type { SessionCookieOptions } from "@/lib/server/session-cookies"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

type PendingCookie = {
  name: string
  options: SessionCookieOptions
  value: string
}

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  vary: "Origin, Sec-Fetch-Site",
  "x-content-type-options": "nosniff",
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST é necessário porque a resolução pode rotacionar cookies de sessão.
export async function POST(request: NextRequest) {
  const pendingCookies: PendingCookie[] = []

  try {
    const environment = getServerEnvironment()
    await assertTrustedMutationRequest(request, environment.appOrigin, {
      body: "none",
      method: "POST",
    })

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

    const response = createSessionResponse(session)

    if (session.state === "authenticated") {
      setRegionalPreferenceCookies(response.cookies, session.user.profile)
    }

    return applyPendingSessionCookies(response, pendingCookies)
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      const response = NextResponse.json(
        { error: { code: "REQUEST_NOT_ALLOWED", retryable: false } },
        { headers: NO_STORE_HEADERS, status: error.status }
      )

      return applyPendingSessionCookies(response, pendingCookies)
    }

    console.error("Authentication session request failed", {
      failureType: error instanceof Error ? error.name : "UnknownError",
    })

    const response = NextResponse.json(
      { authenticated: false, error: { code: "SERVICE_UNAVAILABLE", retryable: true } },
      { headers: NO_STORE_HEADERS, status: 503 }
    )

    return applyPendingSessionCookies(response, pendingCookies)
  }
}

function applyPendingSessionCookies(response: NextResponse, pendingCookies: PendingCookie[]): NextResponse {
  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }

  return response
}

function createSessionResponse(session: Awaited<ReturnType<typeof resolveServerSession>>): NextResponse {
  if (session.state === "authenticated") {
    return NextResponse.json(
      {
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        authenticated: true,
        user: {
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          id: session.user.id,
          name: session.user.name,
          role: session.user.role,
        },
      },
      { headers: NO_STORE_HEADERS }
    )
  }

  if (session.state === "unavailable") {
    return NextResponse.json(
      { authenticated: false, error: { code: "SERVICE_UNAVAILABLE", retryable: true } },
      { headers: NO_STORE_HEADERS, status: 503 }
    )
  }

  return NextResponse.json({ authenticated: false }, { headers: NO_STORE_HEADERS, status: 401 })
}
