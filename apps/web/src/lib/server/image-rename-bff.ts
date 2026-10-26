import "server-only"

import type { GetImagePath, RenameImagePath, RenameImageRequest } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import { isValidImageName } from "../../features/cases/lib/case-image-name"
import type { CaseImage } from "../../features/cases/types/case-image"
import { ImageSchema, projectCaseImage } from "./case-images-bff"

type Request<Path> = (path: Path, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
type Writer = (path: RenameImagePath, body: RenameImageRequest, signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
type ErrorCode = "ACCESS_DENIED" | "IMAGE_NOT_FOUND" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type Failure = { status: 400 | 403 | 404 | 422 | 502 | 503; body: { error: { code: ErrorCode; retryable: boolean } } }
type Result = { status: 200; body: CaseImage } | Failure

const UUID = z.string().uuid()
const RequestSchema: z.ZodType<RenameImageRequest> = z.object({
  display_name: z.string().min(1).max(255),
}).strict()

async function renameImageForBff(
  caseId: string,
  imageId: string,
  value: unknown,
  read: Request<GetImagePath>,
  rename: Writer,
  signal?: AbortSignal,
): Promise<Result> {
  if (!UUID.safeParse(caseId).success || !UUID.safeParse(imageId).success) return failure(400, "VALIDATION_ERROR")
  const request = RequestSchema.safeParse(value)
  if (!request.success) return failure(400, "VALIDATION_ERROR")

  try {
    const existing = await read({ image_id: imageId }, signal)
    if (existing.status !== 200) return mapStatus(existing.status)
    const currentImage = ImageSchema.safeParse(existing.data)
    if (!currentImage.success) return failure(502, "INVALID_RESPONSE")
    if (currentImage.data.id.toLowerCase() !== imageId.toLowerCase()
      || currentImage.data.case_id.toLowerCase() !== caseId.toLowerCase()) {
      return failure(404, "IMAGE_NOT_FOUND")
    }
    if (!isValidImageName(request.data.display_name, currentImage.data.original_filename)) {
      return failure(422, "VALIDATION_ERROR")
    }
    if (signal?.aborted) return failure(503, "SERVICE_UNAVAILABLE")

    const response = await rename({ image_id: imageId }, request.data, signal)
    if (response.status !== 200) return mapStatus(response.status)
    const renamedImage = ImageSchema.safeParse(response.data)
    if (!renamedImage.success) return failure(502, "INVALID_RESPONSE")
    if (renamedImage.data.id.toLowerCase() !== imageId.toLowerCase()
      || renamedImage.data.case_id.toLowerCase() !== caseId.toLowerCase()
      || renamedImage.data.display_name !== request.data.display_name) {
      return failure(502, "INVALID_RESPONSE")
    }

    return { status: 200, body: projectCaseImage(renamedImage.data) }
  } catch (error) {
    return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE") : failure(503, "SERVICE_UNAVAILABLE")
  }
}

function mapStatus(status: number): Failure {
  if (status === 404) return failure(404, "IMAGE_NOT_FOUND")
  if (status === 403) return failure(403, "ACCESS_DENIED")
  if (status === 422) return failure(422, "VALIDATION_ERROR")
  if (status === 400) return failure(400, "VALIDATION_ERROR")
  return status === 401 || status === 429 || status >= 500
    ? failure(503, "SERVICE_UNAVAILABLE")
    : failure(502, "INVALID_RESPONSE")
}

function failure(status: Failure["status"], code: ErrorCode): Failure {
  return { status, body: { error: { code, retryable: status === 503 } } }
}

export { renameImageForBff }
