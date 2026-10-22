import "server-only"

import type { GetCasePath, GetCaseResponse } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { CaseDetail } from "@/features/cases/types/case-detail"
import { CaseWeightResponseSchema } from "../../features/cases/schemas/case-weight.schema"

const CaseDetailSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  title: z.string(),
  animal_name: z.string(),
  species: z.string(),
  breed: z.string().nullable(),
  sex: z.enum(["FEMALE", "MALE", "UNKNOWN"]).nullable(),
  birth_date: z.iso.date().nullable(),
  approximate_age_months: z.number().int().min(0).nullable(),
  age_source: z.enum(["DECLARED", "BIRTH_DATE"]).nullable(),
  age_reference_date: z.iso.date().nullable(),
  weight_kg: CaseWeightResponseSchema,
  clinical_notes: z.string().nullable(),
  status: z.enum(["DRAFT", "IN_PLANNING", "READY", "ARCHIVED"]),
  created_by: z.string().uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<GetCaseResponse>

type CaseDetailErrorCode = "ACCESS_DENIED" | "CASE_NOT_FOUND" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type CaseDetailResult =
  | { body: CaseDetail; status: 200 }
  | { body: { error: { code: CaseDetailErrorCode; retryable: boolean } }; status: 400 | 403 | 404 | 502 | 503 }

type ClinicalCaseReader = (
  path: GetCasePath,
  signal?: AbortSignal,
) => Promise<{ data: unknown; status: number }>

async function getCaseForBff(
  caseId: string,
  readCase: ClinicalCaseReader,
  signal?: AbortSignal,
): Promise<CaseDetailResult> {
  if (!z.string().uuid().safeParse(caseId).success) return failure(400, "VALIDATION_ERROR", false)

  let upstream: Awaited<ReturnType<ClinicalCaseReader>>
  try {
    upstream = await readCase({ case_id: caseId }, signal)
  } catch (error) {
    return error instanceof SyntaxError
      ? failure(502, "INVALID_RESPONSE", false)
      : failure(503, "SERVICE_UNAVAILABLE", true)
  }

  if (upstream.status === 404) return failure(404, "CASE_NOT_FOUND", false)
  if (upstream.status === 422) return failure(400, "VALIDATION_ERROR", false)
  if (upstream.status === 403) return failure(403, "ACCESS_DENIED", false)
  if (upstream.status === 401 || upstream.status === 429 || upstream.status >= 500) {
    return failure(503, "SERVICE_UNAVAILABLE", true)
  }
  if (upstream.status !== 200) return failure(502, "INVALID_RESPONSE", false)

  const detail = parseClinicalCaseDetail(upstream.data)
  if (!detail || detail.id.toLowerCase() !== caseId.toLowerCase()) {
    return failure(502, "INVALID_RESPONSE", false)
  }
  return { status: 200, body: detail }
}

function parseClinicalCaseDetail(value: unknown): CaseDetail | undefined {
  const parsed = CaseDetailSchema.safeParse(value)
  if (!parsed.success) return undefined
  const item = parsed.data
  return {
    id: item.id,
    title: item.title,
    patient: {
      name: item.animal_name,
      species: item.species,
      breed: item.breed,
      sex: item.sex,
      birthDate: item.birth_date,
      approximateAgeMonths: item.approximate_age_months,
      ageSource: item.age_source,
      ageReferenceDate: item.age_reference_date,
      weightKg: item.weight_kg,
    },
    clinicalNotes: item.clinical_notes,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

function failure<Status extends 400 | 403 | 404 | 502 | 503>(
  status: Status,
  code: CaseDetailErrorCode,
  retryable: boolean,
): { body: { error: { code: CaseDetailErrorCode; retryable: boolean } }; status: Status } {
  return { body: { error: { code, retryable } }, status }
}

export { getCaseForBff, parseClinicalCaseDetail }
