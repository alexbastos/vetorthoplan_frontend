import "server-only"

import type { GetIngestionJobPath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { IngestionJob } from "@/features/cases/types/ingestion-job"

const UUID = z.string().uuid()
const DateTime = z.iso.datetime({ offset: true })
const JobSchema = z.object({
  id: UUID, case_id: UUID, image_id: UUID, upload_id: UUID,
  status: z.enum(["QUEUED", "PROCESSING", "SUCCEEDED", "REJECTED", "FAILED"]),
  attempts: z.number().int().min(0), error_code: z.string().nullable(),
  created_at: DateTime, updated_at: DateTime,
  started_at: DateTime.nullable(), finished_at: DateTime.nullable(),
})

type ErrorCode = "ACCESS_DENIED" | "INVALID_RESPONSE" | "JOB_NOT_FOUND" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type Failure = { body: { error: { code: ErrorCode; retryable: boolean } }; status: 400 | 403 | 404 | 502 | 503 }
type Result = { body: IngestionJob; status: 200 } | Failure
type Reader = (path: GetIngestionJobPath, signal?: AbortSignal) => Promise<{ data: unknown; status: number }>

async function getIngestionJobForBff(caseId: string, jobId: string, read: Reader, signal?: AbortSignal): Promise<Result> {
  if (!UUID.safeParse(caseId).success || !UUID.safeParse(jobId).success) return failure(400, "VALIDATION_ERROR", false)
  let upstream: Awaited<ReturnType<Reader>>
  try {
    upstream = await read({ job_id: jobId }, signal)
  } catch (error) {
    return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE", false)
      : failure(503, "SERVICE_UNAVAILABLE", true)
  }
  if (upstream.status === 404) return failure(404, "JOB_NOT_FOUND", false)
  if (upstream.status === 422) return failure(400, "VALIDATION_ERROR", false)
  if (upstream.status === 403) return failure(403, "ACCESS_DENIED", false)
  if (upstream.status === 401 || upstream.status === 429 || upstream.status >= 500) return failure(503, "SERVICE_UNAVAILABLE", true)
  if (upstream.status !== 200) return failure(502, "INVALID_RESPONSE", false)
  const job = parseClinicalIngestionJob(upstream.data)
  if (!job || job.id.toLowerCase() !== jobId.toLowerCase()
    || job.caseId.toLowerCase() !== caseId.toLowerCase()) return failure(502, "INVALID_RESPONSE", false)
  return { status: 200, body: job }
}

function parseClinicalIngestionJob(value: unknown): IngestionJob | undefined {
  const parsed = JobSchema.safeParse(value)
  if (!parsed.success) return undefined
  const item = parsed.data
  return {
    id: item.id, caseId: item.case_id, imageId: item.image_id, uploadId: item.upload_id,
    status: item.status, attempts: item.attempts, errorCode: item.error_code,
    createdAt: item.created_at, updatedAt: item.updated_at,
    startedAt: item.started_at, finishedAt: item.finished_at,
  }
}

function failure(status: Failure["status"], code: ErrorCode, retryable: boolean): Failure {
  return { status, body: { error: { code, retryable } } }
}

export { getIngestionJobForBff, parseClinicalIngestionJob }
