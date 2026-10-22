import { caseFetch } from "./case-fetch"
import { z } from "zod"

import type { ImagePreview } from "../types/image-preview"

const PreviewSchema: z.ZodType<ImagePreview> = z.object({
  url: z.string().url(), mediaType: z.literal("image/png"),
  widthPx: z.number().int().positive(), heightPx: z.number().int().positive(),
  expiresAt: z.iso.datetime({ offset: true }),
})
const ErrorSchema = z.object({ error: z.object({ code: z.string(), retryable: z.boolean() }) })

class ImagePreviewError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, retryable: boolean) {
    super(code)
    this.name = "ImagePreviewError"
    this.code = code
    this.retryable = retryable
  }
}

async function fetchImagePreview(
  caseId: string, imageId: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<ImagePreview> {
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(
      `/api/cases/${encodeURIComponent(caseId)}/images/${encodeURIComponent(imageId)}/preview`,
      { cache: "no-store", credentials: "same-origin", signal: options.signal },
    )
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ImagePreviewError("NETWORK_ERROR", true)
  }
  let body: unknown
  try { body = await response.json() }
  catch { throw new ImagePreviewError("INVALID_RESPONSE", false) }
  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(body)
    throw parsed.success ? new ImagePreviewError(parsed.data.error.code, parsed.data.error.retryable)
      : new ImagePreviewError("INVALID_RESPONSE", false)
  }
  const parsed = PreviewSchema.safeParse(body)
  if (response.status !== 200 || !parsed.success || !validPreviewUrl(parsed.data.url)
    || Date.parse(parsed.data.expiresAt) <= Date.now() + 5_000) {
    throw new ImagePreviewError("INVALID_RESPONSE", false)
  }
  return parsed.data
}

function validPreviewUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return !url.username && !url.password && !url.hash
      && (url.protocol === "https:" || url.protocol === "http:"
        && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  } catch { return false }
}

function previewRefreshInterval(expiresAt: string | undefined, hasError = false, now = Date.now()): number | false {
  if (!expiresAt || hasError) return false
  return Math.max(1_000, Date.parse(expiresAt) - now - 10_000)
}

export { fetchImagePreview, ImagePreviewError, previewRefreshInterval }
