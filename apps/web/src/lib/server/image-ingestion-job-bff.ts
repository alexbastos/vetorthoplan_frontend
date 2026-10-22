import "server-only"

import type { GetImageIngestionJobPath, GetImagePath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { IngestionJob } from "@/features/cases/types/ingestion-job"
import { ImageSchema } from "./case-images-bff"
import { parseClinicalIngestionJob } from "./ingestion-job-bff"

type Reader<Path> = (path: Path, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
type ErrorCode = "ACCESS_DENIED" | "IMAGE_NOT_FOUND" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type Failure = { status: 400 | 403 | 404 | 502 | 503; body: { error: { code: ErrorCode; retryable: boolean } } }
type Result = { status: 200; body: { job: IngestionJob | null } } | Failure

async function getImageIngestionJobForBff(
  caseId: string, imageId: string, readImage: Reader<GetImagePath>, readJob: Reader<GetImageIngestionJobPath>,
  signal?: AbortSignal,
): Promise<Result> {
  if (!z.string().uuid().safeParse(caseId).success || !z.string().uuid().safeParse(imageId).success) {
    return failure(400, "VALIDATION_ERROR", false)
  }
  try {
    const imageResponse = await readImage({ image_id: imageId }, signal)
    if (imageResponse.status !== 200) return mapStatus(imageResponse.status)
    const image = ImageSchema.safeParse(imageResponse.data)
    if (!image.success) return failure(502, "INVALID_RESPONSE", false)
    if (image.data.id.toLowerCase() !== imageId.toLowerCase()
      || image.data.case_id.toLowerCase() !== caseId.toLowerCase()) return failure(404, "IMAGE_NOT_FOUND", false)

    const response = await readJob({ image_id: imageId }, signal)
    if (response.status !== 200) return mapStatus(response.status)
    const envelope = z.object({ job: z.unknown() }).safeParse(response.data)
    // z.unknown() also accepts undefined; the contract requires the property itself.
    if (!envelope.success || !Object.hasOwn(envelope.data, "job") || envelope.data.job === undefined) {
      return failure(502, "INVALID_RESPONSE", false)
    }
    if (envelope.data.job === null) return image.data.job_id === null
      ? { status: 200, body: { job: null } } : failure(502, "INVALID_RESPONSE", false)

    const job = parseClinicalIngestionJob(envelope.data.job)
    if (!job || job.caseId.toLowerCase() !== caseId.toLowerCase()
      || job.imageId.toLowerCase() !== imageId.toLowerCase()
      || job.uploadId.toLowerCase() !== image.data.upload_id.toLowerCase()
      || image.data.job_id !== null && job.id.toLowerCase() !== image.data.job_id.toLowerCase()) {
      return failure(502, "INVALID_RESPONSE", false)
    }
    return { status: 200, body: { job } }
  } catch (error) {
    return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE", false)
      : failure(503, "SERVICE_UNAVAILABLE", true)
  }
}

function mapStatus(status: number): Failure {
  if (status === 404) return failure(404, "IMAGE_NOT_FOUND", false)
  if (status === 403) return failure(403, "ACCESS_DENIED", false)
  if (status === 422) return failure(400, "VALIDATION_ERROR", false)
  return status === 401 || status === 429 || status >= 500
    ? failure(503, "SERVICE_UNAVAILABLE", true) : failure(502, "INVALID_RESPONSE", false)
}

function failure(status: Failure["status"], code: ErrorCode, retryable: boolean): Failure {
  return { status, body: { error: { code, retryable } } }
}

export { getImageIngestionJobForBff }
