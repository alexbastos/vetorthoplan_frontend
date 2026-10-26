import { z } from "zod"

import { caseFetch } from "./case-fetch"

class CaseDeleteError extends Error {
  readonly code: string
  readonly uncertain: boolean
  constructor(code: string, uncertain: boolean) {
    super(code); this.name = "CaseDeleteError"; this.code = code; this.uncertain = uncertain
  }
}

async function deleteClinicalCase(caseId: string, options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<void> {
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(`/api/cases/${encodeURIComponent(caseId)}`, {
      method: "DELETE", cache: "no-store", credentials: "same-origin", signal: options.signal,
    })
  } catch { throw new CaseDeleteError("NETWORK_ERROR", true) }
  if (response.status === 204) return
  let body: unknown
  try { body = await response.json() } catch { throw new CaseDeleteError("INVALID_RESPONSE", true) }
  const parsed = z.object({ error: z.object({ code: z.enum([
    "CASE_NOT_FOUND", "CASE_DELETE_NOT_ALLOWED", "ACCESS_DENIED", "VALIDATION_ERROR", "INVALID_RESPONSE",
    "SERVICE_UNAVAILABLE", "REQUEST_NOT_ALLOWED", "SESSION_UNAVAILABLE",
  ]) }) }).safeParse(body)
  throw new CaseDeleteError(parsed.success ? parsed.data.error.code : "INVALID_RESPONSE", response.status >= 500 || response.ok || !parsed.success)
}

export { deleteClinicalCase, CaseDeleteError }
