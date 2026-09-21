import {
  SESSION_ACCESS_COOKIE_NAME,
  SESSION_REFRESH_COOKIE_NAME,
} from "@/lib/auth-constants"
import { NextResponse, type NextRequest } from "next/server"

import {
  CONTENT_SECURITY_POLICY_REPORT_ONLY_HEADER,
  createContentSecurityPolicyNonce,
  createReportOnlyContentSecurityPolicy,
  isReportOnlyContentSecurityPolicyEnabled,
} from "../security-headers"

const GOOGLE_IDENTITY_PATHS = new Set(["/login", "/register"])

// Barreira de UX; a autorização definitiva permanece nas rotas server-side.
function middleware(request: NextRequest) {
  let contentSecurityPolicy: string | undefined
  let requestHeaders: Headers | undefined

  if (
    isReportOnlyContentSecurityPolicyEnabled(
      process.env.CSP_REPORT_ONLY_ENABLED,
    )
  ) {
    const nonce = createContentSecurityPolicyNonce()
    contentSecurityPolicy = createReportOnlyContentSecurityPolicy({
      allowGoogleIdentity: GOOGLE_IDENTITY_PATHS.has(request.nextUrl.pathname),
      isDevelopment: process.env.NODE_ENV === "development",
      nonce,
    })
    requestHeaders = new Headers(request.headers)

    // O renderer do Next.js lê estes valores para aplicar o nonce.
    requestHeaders.set("content-security-policy", contentSecurityPolicy)
    requestHeaders.set("x-nonce", nonce)
  }

  let response: NextResponse

  if (isAnonymousProtectedRequest(request)) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set(
      "from",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    )

    response = NextResponse.redirect(loginUrl)
  } else {
    response = requestHeaders
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.next()
  }

  if (contentSecurityPolicy) {
    response.headers.set(
      CONTENT_SECURITY_POLICY_REPORT_ONLY_HEADER,
      contentSecurityPolicy,
    )
  }

  return response
}

function isAnonymousProtectedRequest(request: NextRequest): boolean {
  if (
    request.nextUrl.pathname !== "/app" &&
    !request.nextUrl.pathname.startsWith("/app/")
  ) {
    return false
  }

  return !(
    request.cookies.has(SESSION_ACCESS_COOKIE_NAME) ||
    request.cookies.has(SESSION_REFRESH_COOKIE_NAME)
  )
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|brand/|icons/|images/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}

export { middleware }
