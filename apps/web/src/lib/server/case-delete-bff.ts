import "server-only"

import type { DeleteCasePath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

type ErrorCode = "CASE_NOT_FOUND" | "CASE_DELETE_NOT_ALLOWED" | "ACCESS_DENIED" | "VALIDATION_ERROR" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE"
type Failure = { status: 400 | 403 | 404 | 409 | 502 | 503; body: { error: { code: ErrorCode; retryable: boolean } } }
type Result = { status: 204 } | Failure

async function deleteCaseForBff(caseId: string,
  remove: (path: DeleteCasePath, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>,
  signal?: AbortSignal,
): Promise<Result> {
  if (!z.string().uuid().safeParse(caseId).success) return failure(400, "VALIDATION_ERROR")
  if (signal?.aborted) return failure(503, "SERVICE_UNAVAILABLE")
  try {
    // The API scopes case_id to the authenticated organization and decides active-upload conflicts.
    const result = await remove({ case_id: caseId }, signal)
    if (result.status === 204) return { status: 204 }
    if (result.status === 404) return failure(404, "CASE_NOT_FOUND")
    if (result.status === 409) return failure(409, "CASE_DELETE_NOT_ALLOWED")
    if (result.status === 403) return failure(403, "ACCESS_DENIED")
    if (result.status === 400 || result.status === 422) return failure(400, "VALIDATION_ERROR")
    return result.status === 401 || result.status === 429 || result.status >= 500
      ? failure(503, "SERVICE_UNAVAILABLE") : failure(502, "INVALID_RESPONSE")
  } catch (error) {
    return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE") : failure(503, "SERVICE_UNAVAILABLE")
  }
}

function failure(status: Failure["status"], code: ErrorCode): Failure {
  return { status, body: { error: { code, retryable: status === 503 } } }
}

export { deleteCaseForBff }
