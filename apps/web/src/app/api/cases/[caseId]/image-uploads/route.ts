import type { NextRequest } from "next/server"

import { createCasesResponse, withAuthenticatedCasesRoute } from "@/lib/server/cases-bff-route"
import { createImageUploadSessionForBff } from "@/lib/server/image-upload-session-bff"
import { readBoundedRequestBody } from "@/lib/server/request-security"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_METADATA_BYTES = 2 * 1024

export async function POST(request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  return withAuthenticatedCasesRoute(request, async (_session, client) => {
    let body: unknown
    try {
      const bytes = await readBoundedRequestBody(request, MAX_METADATA_BYTES)
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) {
        return createCasesResponse({ error: {
          code: "REQUEST_VALIDATION_ERROR", retryable: false, fieldErrors: [],
        } }, 400)
      }
      throw error
    }

    const { caseId } = await context.params
    const result = await createImageUploadSessionForBff(
      caseId,
      body,
      request.headers.get("idempotency-key"),
      (pathParams, input, headers, signal) => client.request({
        method: "post",
        path: "/api/v1/cases/{case_id}/image-uploads",
        pathParams,
        body: input,
        headers,
        signal,
      }),
      request.signal,
    )
    return createCasesResponse(result.body, result.status)
  }, { body: "application/json", method: "POST" })
}
