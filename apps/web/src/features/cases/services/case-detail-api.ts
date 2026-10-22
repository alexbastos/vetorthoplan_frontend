import { caseFetch } from "./case-fetch"
import { z } from "zod"

import type { CaseDetail } from "../types/case-detail"
import { CaseWeightResponseSchema } from "../schemas/case-weight.schema"

const CaseDetailSchema: z.ZodType<CaseDetail> = z.object({
  id: z.string().uuid(),
  title: z.string(),
  patient: z.object({
    name: z.string(),
    species: z.string(),
    breed: z.string().nullable(),
    sex: z.enum(["FEMALE", "MALE", "UNKNOWN"]).nullable(),
    birthDate: z.iso.date().nullable(),
    approximateAgeMonths: z.number().int().min(0).nullable(),
    ageSource: z.enum(["DECLARED", "BIRTH_DATE"]).nullable(),
    ageReferenceDate: z.iso.date().nullable(),
    weightKg: CaseWeightResponseSchema,
  }),
  clinicalNotes: z.string().nullable(),
  status: z.enum(["DRAFT", "IN_PLANNING", "READY", "ARCHIVED"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

class CaseDetailRequestError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, retryable: boolean) {
    super(code)
    this.name = "CaseDetailRequestError"
    this.code = code
    this.retryable = retryable
  }
}

async function fetchCaseDetail(
  caseId: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<CaseDetail> {
  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(`/api/cases/${encodeURIComponent(caseId)}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new CaseDetailRequestError("NETWORK_ERROR", true)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new CaseDetailRequestError("INVALID_RESPONSE", false)
  }

  if (!response.ok) {
    const parsed = z.object({
      error: z.object({ code: z.string(), retryable: z.boolean() }),
    }).safeParse(body)
    throw new CaseDetailRequestError(
      parsed.success ? parsed.data.error.code : "SERVICE_UNAVAILABLE",
      parsed.success ? parsed.data.error.retryable : response.status >= 500,
    )
  }

  const parsed = CaseDetailSchema.safeParse(body)
  if (!parsed.success || parsed.data.id.toLowerCase() !== caseId.toLowerCase()) {
    throw new CaseDetailRequestError("INVALID_RESPONSE", false)
  }
  return parsed.data
}

export { CaseDetailRequestError, CaseDetailSchema, fetchCaseDetail }
