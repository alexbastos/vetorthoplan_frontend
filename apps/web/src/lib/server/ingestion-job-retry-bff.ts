import "server-only"

import type { GetIngestionJobPath, RetryIngestionJobPath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { IngestionJob } from "@/features/cases/types/ingestion-job"
import { parseClinicalIngestionJob } from "./ingestion-job-bff"

type Request<Path> = (path: Path, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
type ErrorCode = "ACCESS_DENIED" | "INVALID_RESPONSE" | "JOB_NOT_FOUND" | "JOB_RETRY_NOT_ALLOWED" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type Failure = { status: 400 | 403 | 404 | 409 | 502 | 503; body: { error: { code: ErrorCode; retryable: boolean } } }
type Result = { status: 202; body: IngestionJob } | Failure

async function retryIngestionJobForBff(
  caseId: string, jobId: string, read: Request<GetIngestionJobPath>, retry: Request<RetryIngestionJobPath>, signal?: AbortSignal,
): Promise<Result> {
  if (!z.string().uuid().safeParse(caseId).success || !z.string().uuid().safeParse(jobId).success) {
    return failure(400, "VALIDATION_ERROR", false)
  }
  try {
    // Validate case ownership BEFORE any mutation; checking only the POST response is too late.
    const current = await read({ job_id: jobId }, signal)
    if (current.status !== 200) return mapStatus(current.status)
    const before = parseClinicalIngestionJob(current.data)
    if (!before || before.id.toLowerCase() !== jobId.toLowerCase()) return failure(502, "INVALID_RESPONSE", false)
    if (before.caseId.toLowerCase() !== caseId.toLowerCase()) return failure(404, "JOB_NOT_FOUND", false)
    if (before.status !== "FAILED") return failure(409, "JOB_RETRY_NOT_ALLOWED", false)
    if (signal?.aborted) return failure(503, "SERVICE_UNAVAILABLE", true)

    const response = await retry({ job_id: jobId }, signal)
    if (response.status !== 202) return mapStatus(response.status)
    const after = parseClinicalIngestionJob(response.data)
    if (!after || after.id.toLowerCase() !== before.id.toLowerCase()
      || after.caseId.toLowerCase() !== before.caseId.toLowerCase()
      || after.imageId.toLowerCase() !== before.imageId.toLowerCase()
      || after.uploadId.toLowerCase() !== before.uploadId.toLowerCase()) return failure(502, "INVALID_RESPONSE", false)
    return { status: 202, body: after }
  } catch (error) {
    return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE", false)
      : failure(503, "SERVICE_UNAVAILABLE", true)
  }
}

function mapStatus(status: number): Failure {
  if (status === 404) return failure(404, "JOB_NOT_FOUND", false)
  if (status === 409) return failure(409, "JOB_RETRY_NOT_ALLOWED", false)
  if (status === 403) return failure(403, "ACCESS_DENIED", false)
  if (status === 422) return failure(400, "VALIDATION_ERROR", false)
  return status === 401 || status === 429 || status >= 500
    ? failure(503, "SERVICE_UNAVAILABLE", true) : failure(502, "INVALID_RESPONSE", false)
}

function failure(status: Failure["status"], code: ErrorCode, retryable: boolean): Failure {
  return { status, body: { error: { code, retryable } } }
}

export { retryIngestionJobForBff }
