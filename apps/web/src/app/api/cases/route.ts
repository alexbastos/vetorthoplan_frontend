import type { NextRequest } from "next/server"

import { createCaseForBff } from "@/lib/server/case-create-bff"
import { listCasesForBff } from "@/lib/server/case-list-bff"
import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { readBoundedRequestBody } from "@/lib/server/request-security"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_CREATE_CASE_BYTES = 32 * 1024

export async function GET(request: NextRequest) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    const result = await listCasesForBff(
      request.nextUrl.searchParams,
      (query, signal) => client.request({
        method: "get",
        path: "/api/v1/cases",
        query,
        signal,
      }),
      request.signal,
    )

    return createCasesResponse(result.body, result.status)
  })
}

export async function POST(request: NextRequest) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    let body: unknown
    try {
      const bytes = await readBoundedRequestBody(request, MAX_CREATE_CASE_BYTES)
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) {
        return createCasesResponse({ error: {
          code: "REQUEST_VALIDATION_ERROR", retryable: false, fieldErrors: [],
        } }, 400)
      }
      throw error
    }

    const result = await createCaseForBff(
      body,
      request.headers.get("idempotency-key"),
      (input, idempotencyKey, signal) => client.request({
        method: "post",
        path: "/api/v1/cases",
        body: input,
        headers: { "Idempotency-Key": idempotencyKey },
        signal,
      }),
      request.signal,
    )
    return createCasesResponse(result.body, result.status)
  }, { body: "application/json", method: "POST" })
}
