import { caseFetch } from "./case-fetch"
import type { CreateCaseRequest } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { CaseDetail } from "../types/case-detail"
import { CaseDetailSchema } from "./case-detail-api"

const CreateErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    retryable: z.boolean(),
    fieldErrors: z.array(z.object({ field: z.string(), type: z.string() })).optional(),
  }),
})

class CaseCreateRequestError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly fieldErrors: readonly { field: string; type: string }[]

  constructor(code: string, retryable: boolean, fieldErrors: readonly { field: string; type: string }[] = []) {
    super(code)
    this.name = "CaseCreateRequestError"
    this.code = code
    this.retryable = retryable
    this.fieldErrors = fieldErrors
  }
}

async function createCase(
  input: CreateCaseRequest,
  idempotencyKey: string,
  fetchImpl: typeof fetch = caseFetch,
): Promise<CaseDetail> {
  let response: Response
  try {
    response = await fetchImpl("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(input),
      cache: "no-store",
      credentials: "same-origin",
    })
  } catch {
    throw new CaseCreateRequestError("NETWORK_ERROR", true)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new CaseCreateRequestError("INVALID_RESPONSE", false)
  }

  if (!response.ok) {
    const parsed = CreateErrorSchema.safeParse(body)
    throw parsed.success
      ? new CaseCreateRequestError(parsed.data.error.code, parsed.data.error.retryable, parsed.data.error.fieldErrors)
      : new CaseCreateRequestError("INVALID_RESPONSE", false)
  }

  const parsed = CaseDetailSchema.safeParse(body)
  if (response.status !== 201 || !parsed.success || parsed.data.status !== "DRAFT") {
    throw new CaseCreateRequestError("INVALID_RESPONSE", false)
  }
  return parsed.data
}

export { CaseCreateRequestError, createCase }
