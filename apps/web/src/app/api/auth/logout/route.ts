import {
  createSuccessResponse,
  createUnexpectedRouteErrorResponse,
  getAuthenticationRouteClient,
  logUnexpectedAuthenticationFailure,
} from "@/lib/server/auth-bff-route"
import { clearSessionCookies } from "@/lib/server/session-cookies"
import { revokeCurrentServerSession } from "@/lib/server/session"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  let client

  try {
    client = await getAuthenticationRouteClient(request, "none")
  } catch (error) {
    return createUnexpectedRouteErrorResponse("logout", error)
  }

  try {
    await revokeCurrentServerSession({ client, cookieReader: request.cookies })
  } catch (error) {
    logUnexpectedAuthenticationFailure("logout", error)
  }

  const response = createSuccessResponse()
  clearSessionCookies(response.cookies)
  return response
}
