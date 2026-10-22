import { caseFetch } from "./case-fetch"
import { z } from "zod"

import type { ImageIngestionIdentity } from "../types/ingestion-reference"

class ImageUploadCancelError extends Error {
  readonly code: string
  readonly uncertain: boolean
  constructor(code: string, uncertain: boolean) {
    super(code); this.name = "ImageUploadCancelError"; this.code = code; this.uncertain = uncertain
  }
}

async function cancelImageUpload(identity: ImageIngestionIdentity, options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<void> {
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(`/api/cases/${encodeURIComponent(identity.caseId)}/image-uploads/${encodeURIComponent(identity.uploadId)}`, {
      method: "DELETE", cache: "no-store", credentials: "same-origin", signal: options.signal,
    })
  } catch { throw new ImageUploadCancelError("NETWORK_ERROR", true) }
  if (response.status === 204) return
  let body: unknown
  try { body = await response.json() } catch { throw new ImageUploadCancelError("INVALID_RESPONSE", true) }
  const parsed = z.object({ error: z.object({ code: z.enum([
    "IMAGE_UPLOAD_NOT_FOUND", "IMAGE_UPLOAD_CANCEL_NOT_ALLOWED", "ACCESS_DENIED", "INVALID_RESPONSE", "SERVICE_UNAVAILABLE", "VALIDATION_ERROR", "REQUEST_NOT_ALLOWED", "SESSION_UNAVAILABLE",
  ]) }) }).safeParse(body)
  throw new ImageUploadCancelError(parsed.success ? parsed.data.error.code : "INVALID_RESPONSE", response.status >= 500 || response.ok || !parsed.success)
}

export { cancelImageUpload, ImageUploadCancelError }
