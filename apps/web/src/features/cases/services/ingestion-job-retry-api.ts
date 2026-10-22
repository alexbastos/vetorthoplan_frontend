import { caseFetch } from "./case-fetch"
import { z } from "zod"

import type { IngestionJobIdentity } from "../types/ingestion-reference"
import type { IngestionJob } from "../types/ingestion-job"
import { parseIngestionJobResponse } from "./image-read-api"

class IngestionRetryError extends Error {
  readonly code: string
  readonly uncertain: boolean

  constructor(code: string, uncertain: boolean) {
    super(code)
    this.name = "IngestionRetryError"
    this.code = code
    this.uncertain = uncertain
  }
}

async function retryIngestionJob(identity: IngestionJobIdentity, options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<IngestionJob> {
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(`/api/cases/${encodeURIComponent(identity.caseId)}/jobs/${encodeURIComponent(identity.jobId)}/retry`, {
      method: "POST", cache: "no-store", credentials: "same-origin", signal: options.signal,
    })
  } catch { throw new IngestionRetryError("NETWORK_ERROR", true) }
  let body: unknown
  try { body = await response.json() } catch { throw new IngestionRetryError("INVALID_RESPONSE", true) }
  if (response.status !== 202) {
    const parsed = z.object({ error: z.object({ code: z.enum([
      "ACCESS_DENIED", "INVALID_RESPONSE", "JOB_NOT_FOUND", "JOB_RETRY_NOT_ALLOWED", "SERVICE_UNAVAILABLE", "VALIDATION_ERROR", "REQUEST_NOT_ALLOWED",
    ]) }) }).safeParse(body)
    throw new IngestionRetryError(parsed.success ? parsed.data.error.code : "INVALID_RESPONSE",
      response.status >= 500 || response.ok || !parsed.success)
  }
  const job = parseIngestionJobResponse(body, identity)
  if (!job) throw new IngestionRetryError("INVALID_RESPONSE", true)
  return job
}

export { IngestionRetryError, retryIngestionJob }
