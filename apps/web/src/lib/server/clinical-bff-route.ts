import "server-only"

import { NextResponse, type NextRequest } from "next/server"

import { createAuthenticationApiClient } from "./authentication-api"
import { getClinicalServerEnvironment } from "./environment"
import { assertTrustedMutationRequest, readBoundedRequestBody } from "./request-security"
import { resolveServerSession, type AuthenticatedServerSession } from "./session"
import type { SessionCookieOptions } from "./session-cookies"

type ClinicalContext = {
  apiBaseUrl: string
  session: AuthenticatedServerSession
}

type PendingCookie = { name: string; options: SessionCookieOptions; value: string }

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  vary: "Origin, Sec-Fetch-Site",
  "x-content-type-options": "nosniff",
}

async function withClinicalSession(
  request: NextRequest,
  handler: (context: ClinicalContext) => Promise<NextResponse>,
  mutation?: { method: "POST" | "PUT"; body?: "application/json" | "none" },
): Promise<NextResponse> {
  const pendingCookies: PendingCookie[] = []
  let response: NextResponse

  try {
    const environment = getClinicalServerEnvironment()
    if (mutation) {
      await assertTrustedMutationRequest(request, environment.appOrigin, {
        body: mutation.body ?? "application/json",
        method: mutation.method,
      })
    }
    const session = await resolveServerSession({
      client: createAuthenticationApiClient(environment),
      cookieReader: request.cookies,
      cookieWriter: {
        set(name, value, options) {
          pendingCookies.push({ name, options, value })
        },
      },
      sessionCookieSecrets: environment.sessionCookieSecrets,
    })

    if (session.state === "authenticated") {
      response = await handler({ apiBaseUrl: environment.vetorthoplanApiBaseUrl, session })
    } else if (session.state === "unavailable") {
      response = clinicalJson({ error: { code: "SERVICE_UNAVAILABLE", retryable: true } }, 503)
    } else {
      response = clinicalJson({ error: { code: "SESSION_UNAVAILABLE", retryable: false } }, 401)
    }
  } catch {
    response = clinicalJson({ error: { code: "CLINICAL_REQUEST_FAILED", retryable: true } }, 503)
  }

  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  return response
}

async function proxyClinicalJson(
  context: ClinicalContext,
  path: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const response = await fetch(new URL(path, context.apiBaseUrl), {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${context.session.accessToken}`,
      ...Object.fromEntries(new Headers(init.headers).entries()),
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  })
  const body = await response.text()
  return new NextResponse(body || null, {
    status: response.status,
    headers: {
      ...NO_STORE_HEADERS,
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  })
}

async function readClinicalMutationBody(request: NextRequest): Promise<Uint8Array> {
  return readBoundedRequestBody(request, 256 * 1024)
}

function clinicalJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

export {
  clinicalJson,
  proxyClinicalJson,
  readClinicalMutationBody,
  withClinicalSession,
}
