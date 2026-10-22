import { caseFetch } from "./case-fetch"
import { z } from "zod"

import { ImageOrientationPatientSchema, ImageStatusSchema, PixelSpacingMmSchema } from "../schemas/case-image.schema"
import type { CaseImage } from "../types/case-image"
import type { ImageIngestionIdentity, IngestionJobIdentity } from "../types/ingestion-reference"
import type { IngestionJob } from "../types/ingestion-job"

const UUID = z.string().uuid()
const DateTime = z.iso.datetime({ offset: true })
const CaseImageSchema: z.ZodType<CaseImage> = z.object({
  id: UUID, uploadId: UUID, jobId: UUID.nullable(), caseId: UUID, originalFilename: z.string(),
  kind: z.enum(["DICOM", "PNG", "JPEG"]), mediaType: z.string(),
  detectedMediaType: z.string().nullable(), sizeBytes: z.number().int().positive(),
  status: ImageStatusSchema,
  widthPx: z.number().int().positive().nullable(), heightPx: z.number().int().positive().nullable(),
  rejectionCode: z.string().nullable(), createdAt: DateTime,
  completedAt: DateTime.nullable(), processedAt: DateTime.nullable(),
  previewAvailable: z.boolean(), previewWidthPx: z.number().int().positive().nullable(),
  previewHeightPx: z.number().int().positive().nullable(),
  pixelSpacingMm: PixelSpacingMmSchema, imagerPixelSpacingMm: PixelSpacingMmSchema,
  imageOrientationPatient: ImageOrientationPatientSchema,
})
const ImageListSchema = z.object({ items: z.array(CaseImageSchema) })
const JobSchema: z.ZodType<IngestionJob> = z.object({
  id: UUID, caseId: UUID, imageId: UUID, uploadId: UUID,
  status: z.enum(["QUEUED", "PROCESSING", "SUCCEEDED", "REJECTED", "FAILED"]),
  attempts: z.number().int().min(0), errorCode: z.string().nullable(),
  createdAt: DateTime, updatedAt: DateTime,
  startedAt: DateTime.nullable(), finishedAt: DateTime.nullable(),
})
const ErrorSchema = z.object({ error: z.object({ code: z.string(), retryable: z.boolean() }) })

class ImageReadError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, retryable: boolean) {
    super(code)
    this.name = "ImageReadError"
    this.code = code
    this.retryable = retryable
  }
}

async function fetchCaseImages(caseId: string, options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<CaseImage[]> {
  const body = await readJson(`/api/cases/${encodeURIComponent(caseId)}/images`, options)
  const parsed = ImageListSchema.safeParse(body)
  if (!parsed.success || parsed.data.items.some((item) => item.caseId.toLowerCase() !== caseId.toLowerCase())) {
    throw new ImageReadError("INVALID_RESPONSE", false)
  }
  return parsed.data.items
}

async function fetchIngestionJob(completed: IngestionJobIdentity, options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<IngestionJob> {
  const body = await readJson(`/api/cases/${encodeURIComponent(completed.caseId)}/jobs/${encodeURIComponent(completed.jobId)}`, options)
  const job = parseIngestionJobResponse(body, completed)
  if (!job) throw new ImageReadError("INVALID_RESPONSE", false)
  return job
}

function parseIngestionJobResponse(body: unknown, completed: IngestionJobIdentity): IngestionJob | undefined {
  const parsed = JobSchema.safeParse(body)
  if (!parsed.success || parsed.data.id.toLowerCase() !== completed.jobId.toLowerCase()
    || parsed.data.caseId.toLowerCase() !== completed.caseId.toLowerCase()
    || parsed.data.imageId.toLowerCase() !== completed.imageId.toLowerCase()
    || parsed.data.uploadId.toLowerCase() !== completed.uploadId.toLowerCase()) {
    return undefined
  }
  return parsed.data
}

async function fetchImageIngestionJob(image: ImageIngestionIdentity, options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<IngestionJob | null> {
  const body = await readJson(`/api/cases/${encodeURIComponent(image.caseId)}/images/${encodeURIComponent(image.imageId)}/job`, options)
  const parsed = z.object({ job: JobSchema.nullable() }).safeParse(body)
  if (!parsed.success || parsed.data.job && (
    parsed.data.job.caseId.toLowerCase() !== image.caseId.toLowerCase()
    || parsed.data.job.imageId.toLowerCase() !== image.imageId.toLowerCase()
    || parsed.data.job.uploadId.toLowerCase() !== image.uploadId.toLowerCase()
  )) throw new ImageReadError("INVALID_RESPONSE", false)
  return parsed.data.job
}

async function readJson(url: string, options: { signal?: AbortSignal; fetchImpl?: typeof fetch }): Promise<unknown> {
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(url, {
      cache: "no-store", credentials: "same-origin", signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ImageReadError("NETWORK_ERROR", true)
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ImageReadError("INVALID_RESPONSE", false)
  }
  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(body)
    throw parsed.success
      ? new ImageReadError(parsed.data.error.code, parsed.data.error.retryable)
      : new ImageReadError("INVALID_RESPONSE", false)
  }
  return body
}

export { fetchCaseImages, fetchImageIngestionJob, fetchIngestionJob, ImageReadError, parseIngestionJobResponse }
