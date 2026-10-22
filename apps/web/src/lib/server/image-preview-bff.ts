import "server-only"

import type { GetImagePath, GetImagePreviewPath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { ImagePreview } from "@/features/cases/types/image-preview"
import { ImageSchema } from "./case-images-bff"

const UUID = z.string().uuid()
const PreviewSchema = z.object({
  url: z.string().url(), media_type: z.literal("image/png"),
  width_px: z.number().int().positive(), height_px: z.number().int().positive(),
  expires_at: z.iso.datetime({ offset: true }),
})

type ErrorCode = "ACCESS_DENIED" | "IMAGE_NOT_FOUND" | "INVALID_RESPONSE" | "PREVIEW_UNAVAILABLE" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type Failure = { status: 400 | 403 | 404 | 409 | 502 | 503; body: { error: { code: ErrorCode; retryable: boolean } } }
type Result = { status: 200; body: ImagePreview } | Failure
type ImageReader = (path: GetImagePath, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
type PreviewReader = (path: GetImagePreviewPath, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>

async function getImagePreviewForBff(
  caseId: string, imageId: string, readImage: ImageReader, readPreview: PreviewReader,
  signal?: AbortSignal,
): Promise<Result> {
  if (!UUID.safeParse(caseId).success || !UUID.safeParse(imageId).success) return failure(400, "VALIDATION_ERROR", false)
  let imageResponse: Awaited<ReturnType<ImageReader>>
  try {
    imageResponse = await readImage({ image_id: imageId }, signal)
  } catch (error) {
    return upstreamFailure(error)
  }
  if (imageResponse.status !== 200) return mapStatus(imageResponse.status)
  const image = ImageSchema.safeParse(imageResponse.data)
  if (!image.success) return failure(502, "INVALID_RESPONSE", false)
  if (image.data.id.toLowerCase() !== imageId.toLowerCase()
    || image.data.case_id.toLowerCase() !== caseId.toLowerCase()) return failure(404, "IMAGE_NOT_FOUND", false)
  if (image.data.status !== "READY" || !image.data.preview_available) return failure(409, "PREVIEW_UNAVAILABLE", false)

  let previewResponse: Awaited<ReturnType<PreviewReader>>
  try {
    previewResponse = await readPreview({ image_id: imageId }, signal)
  } catch (error) {
    return upstreamFailure(error)
  }
  if (previewResponse.status !== 200) return mapStatus(previewResponse.status)
  const parsed = PreviewSchema.safeParse(previewResponse.data)
  if (!parsed.success || !validPreviewUrl(parsed.data.url)
    || Date.parse(parsed.data.expires_at) <= Date.now() + 5_000
    || image.data.preview_width_px !== null && parsed.data.width_px !== image.data.preview_width_px
    || image.data.preview_height_px !== null && parsed.data.height_px !== image.data.preview_height_px) {
    return failure(502, "INVALID_RESPONSE", false)
  }
  return { status: 200, body: {
    url: parsed.data.url, mediaType: parsed.data.media_type,
    widthPx: parsed.data.width_px, heightPx: parsed.data.height_px,
    expiresAt: parsed.data.expires_at,
  } }
}

function validPreviewUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return !url.username && !url.password && !url.hash
      && (url.protocol === "https:" || process.env.NODE_ENV !== "production"
        && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  } catch { return false }
}

function mapStatus(status: number): Failure {
  if (status === 404) return failure(404, "IMAGE_NOT_FOUND", false)
  if (status === 409) return failure(409, "PREVIEW_UNAVAILABLE", false)
  if (status === 422) return failure(400, "VALIDATION_ERROR", false)
  if (status === 403) return failure(403, "ACCESS_DENIED", false)
  return status === 401 || status === 429 || status >= 500
    ? failure(503, "SERVICE_UNAVAILABLE", true) : failure(502, "INVALID_RESPONSE", false)
}

function upstreamFailure(error: unknown): Failure {
  return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE", false)
    : failure(503, "SERVICE_UNAVAILABLE", true)
}

function failure(status: Failure["status"], code: ErrorCode, retryable: boolean): Failure {
  return { status, body: { error: { code, retryable } } }
}

export { getImagePreviewForBff }
