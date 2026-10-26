import type { RenameImageRequest } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import { caseFetch } from "./case-fetch"

const UUID = z.string().uuid()
const RenameResponseSchema = z.object({
  id: UUID,
  caseId: UUID,
  displayName: z.string().nullable(),
})
const ErrorSchema = z.object({ error: z.object({ code: z.string(), retryable: z.boolean() }) })

class ImageRenameError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, retryable: boolean) {
    super(code)
    this.name = "ImageRenameError"
    this.code = code
    this.retryable = retryable
  }
}

async function renameCaseImage(
  caseId: string,
  imageId: string,
  displayName: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<{ id: string; caseId: string; displayName: string | null }> {
  const input: RenameImageRequest = { display_name: displayName }
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(
      `/api/cases/${encodeURIComponent(caseId)}/images/${encodeURIComponent(imageId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
        credentials: "same-origin",
        signal: options.signal,
      },
    )
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ImageRenameError("NETWORK_ERROR", true)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ImageRenameError("INVALID_RESPONSE", false)
  }

  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(body)
    throw parsed.success
      ? new ImageRenameError(parsed.data.error.code, parsed.data.error.retryable)
      : new ImageRenameError("INVALID_RESPONSE", false)
  }

  const parsed = RenameResponseSchema.safeParse(body)
  if (response.status !== 200 || !parsed.success
    || parsed.data.caseId.toLowerCase() !== caseId.toLowerCase()
    || parsed.data.id.toLowerCase() !== imageId.toLowerCase()
    || parsed.data.displayName !== displayName) {
    throw new ImageRenameError("INVALID_RESPONSE", false)
  }
  return parsed.data
}

export { ImageRenameError, renameCaseImage }
