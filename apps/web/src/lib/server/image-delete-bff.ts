import "server-only"

import type { DeleteImagePath, GetImagePath } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import { ImageSchema } from "./case-images-bff"

type Request<Path> = (path: Path, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
type ErrorCode = "IMAGE_NOT_FOUND" | "IMAGE_DELETE_NOT_ALLOWED" | "ACCESS_DENIED" | "VALIDATION_ERROR" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE"
type Failure = { status: 400 | 403 | 404 | 409 | 502 | 503; body: { error: { code: ErrorCode; retryable: boolean } } }
type Result = { status: 204 } | Failure

async function deleteImageForBff(caseId: string, imageId: string, read: Request<GetImagePath>, remove: Request<DeleteImagePath>, signal?: AbortSignal): Promise<Result> {
  if (!z.string().uuid().safeParse(caseId).success || !z.string().uuid().safeParse(imageId).success) return failure(400, "VALIDATION_ERROR")
  try {
    // The clinical DELETE accepts only image_id. Bind it to this case before mutating.
    const response = await read({ image_id: imageId }, signal)
    if (response.status !== 200) return mapStatus(response.status)
    const image = ImageSchema.safeParse(response.data)
    if (!image.success) return failure(502, "INVALID_RESPONSE")
    if (image.data.id.toLowerCase() !== imageId.toLowerCase() || image.data.case_id.toLowerCase() !== caseId.toLowerCase()) return failure(404, "IMAGE_NOT_FOUND")
    if (signal?.aborted) return failure(503, "SERVICE_UNAVAILABLE")
    // Session validity and job activity are authoritative at the backend, including races.
    const result = await remove({ image_id: imageId }, signal)
    return result.status === 204 ? { status: 204 } : mapStatus(result.status)
  } catch (error) {
    return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE") : failure(503, "SERVICE_UNAVAILABLE")
  }
}
function mapStatus(status: number): Failure {
  if (status === 404) return failure(404, "IMAGE_NOT_FOUND")
  if (status === 409) return failure(409, "IMAGE_DELETE_NOT_ALLOWED")
  if (status === 403) return failure(403, "ACCESS_DENIED")
  if (status === 400 || status === 422) return failure(400, "VALIDATION_ERROR")
  return failure(status === 401 || status === 429 || status >= 500 ? 503 : 502, status === 401 || status === 429 || status >= 500 ? "SERVICE_UNAVAILABLE" : "INVALID_RESPONSE")
}
function failure(status: Failure["status"], code: ErrorCode): Failure {
  return { status, body: { error: { code, retryable: status === 503 } } }
}
export { deleteImageForBff }
