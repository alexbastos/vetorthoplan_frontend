import { caseFetch } from "./case-fetch"
import { z } from "zod"

class ImageDeleteError extends Error {
  readonly code: string
  readonly uncertain: boolean
  constructor(code: string, uncertain: boolean) {
    super(code); this.name = "ImageDeleteError"; this.code = code; this.uncertain = uncertain
  }
}
async function deleteCaseImage(caseId: string, imageId: string, options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<void> {
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(`/api/cases/${encodeURIComponent(caseId)}/images/${encodeURIComponent(imageId)}`, {
      method: "DELETE", cache: "no-store", credentials: "same-origin", signal: options.signal,
    })
  } catch { throw new ImageDeleteError("NETWORK_ERROR", true) }
  if (response.status === 204) return
  let body: unknown
  try { body = await response.json() } catch { throw new ImageDeleteError("INVALID_RESPONSE", true) }
  const parsed = z.object({ error: z.object({ code: z.enum([
    "IMAGE_NOT_FOUND", "IMAGE_DELETE_NOT_ALLOWED", "ACCESS_DENIED", "INVALID_RESPONSE", "SERVICE_UNAVAILABLE", "VALIDATION_ERROR", "REQUEST_NOT_ALLOWED", "SESSION_UNAVAILABLE",
  ]) }) }).safeParse(body)
  throw new ImageDeleteError(parsed.success ? parsed.data.error.code : "INVALID_RESPONSE", response.status >= 500 || response.ok || !parsed.success)
}
export { deleteCaseImage, ImageDeleteError }
