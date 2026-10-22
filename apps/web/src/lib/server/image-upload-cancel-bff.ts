import "server-only"

import type { CancelImageUploadPath, ListCaseImagesPath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import { listCaseImagesForBff } from "./case-images-bff"

type Request<Path> = (path: Path, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
type ErrorCode = "ACCESS_DENIED" | "IMAGE_UPLOAD_NOT_FOUND" | "IMAGE_UPLOAD_CANCEL_NOT_ALLOWED" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type Failure = { status: 400 | 403 | 404 | 409 | 502 | 503; body: { error: { code: ErrorCode; retryable: boolean } } }
type Result = { status: 204 } | Failure

async function cancelImageUploadForBff(caseId: string, uploadId: string,
  readImages: Request<ListCaseImagesPath>, cancel: Request<CancelImageUploadPath>, signal?: AbortSignal,
): Promise<Result> {
  if (!z.string().uuid().safeParse(caseId).success || !z.string().uuid().safeParse(uploadId).success) return failure(400, "VALIDATION_ERROR", false)
  // There is no GET upload endpoint. Resolve its image from the tenant-scoped case list BEFORE deleting.
  const images = await listCaseImagesForBff(caseId, readImages, signal)
  if (images.status !== 200) return mapStatus(images.status)
  const image = images.body.items.find(item => item.uploadId.toLowerCase() === uploadId.toLowerCase())
  if (!image) return failure(404, "IMAGE_UPLOAD_NOT_FOUND", false)
  if (image.status === "CANCELLED") return { status: 204 }
  if (image.status !== "PENDING_UPLOAD") return failure(409, "IMAGE_UPLOAD_CANCEL_NOT_ALLOWED", false)
  if (signal?.aborted) return failure(503, "SERVICE_UNAVAILABLE", true)
  try {
    const result = await cancel({ upload_id: uploadId }, signal)
    return result.status === 204 ? { status: 204 } : mapStatus(result.status)
  } catch (error) {
    return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE", false) : failure(503, "SERVICE_UNAVAILABLE", true)
  }
}

function mapStatus(status: number): Failure {
  if (status === 404) return failure(404, "IMAGE_UPLOAD_NOT_FOUND", false)
  if (status === 409) return failure(409, "IMAGE_UPLOAD_CANCEL_NOT_ALLOWED", false)
  if (status === 403) return failure(403, "ACCESS_DENIED", false)
  if (status === 400 || status === 422) return failure(400, "VALIDATION_ERROR", false)
  return status === 401 || status === 429 || status === 503 || status >= 500 && status !== 502
    ? failure(503, "SERVICE_UNAVAILABLE", true) : failure(502, "INVALID_RESPONSE", false)
}
function failure(status: Failure["status"], code: ErrorCode, retryable: boolean): Failure {
  return { status, body: { error: { code, retryable } } }
}
export { cancelImageUploadForBff }
