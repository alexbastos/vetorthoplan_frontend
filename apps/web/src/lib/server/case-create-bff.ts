import "server-only"

import type { CreateCaseRequest } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

import type { CaseDetail } from "@/features/cases/types/case-detail"
import { CaseWeightRequestSchema } from "../../features/cases/schemas/case-weight.schema"
import { parseClinicalCaseDetail } from "./case-detail-bff"

const FIELD_NAMES = [
  "title", "animal_name", "species", "breed", "sex", "birth_date",
  "approximate_age_months", "weight_kg", "clinical_notes",
] as const
const FIELD_SET = new Set<string>(FIELD_NAMES)
const SAFE_ERROR_TYPE = /^[a-z][a-z0-9_]{0,63}$/

const CreateCaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  animal_name: z.string().trim().min(1).max(120),
  species: z.string().trim().min(1).max(80),
  breed: z.string().max(120).nullable().optional(),
  sex: z.enum(["FEMALE", "MALE", "UNKNOWN"]),
  birth_date: z.iso.date().nullable().optional(),
  approximate_age_months: z.number().int().min(0).max(600).nullable().optional(),
  weight_kg: CaseWeightRequestSchema.optional(),
  clinical_notes: z.string().max(4_000).nullable().optional(),
}).strict()

type FieldError = { field: string; type: string }
type CreateCaseErrorCode =
  | "ACCESS_DENIED"
  | "CASE_VALIDATION_ERROR"
  | "IDEMPOTENCY_KEY_REUSED"
  | "INVALID_RESPONSE"
  | "REQUEST_VALIDATION_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "VALIDATION_ERROR"
type CreateCaseResult =
  | { body: CaseDetail; status: 201 }
  | { body: { error: { code: CreateCaseErrorCode; retryable: boolean; fieldErrors?: FieldError[] } }; status: 400 | 403 | 409 | 422 | 502 | 503 }

type ClinicalCaseWriter = (
  body: CreateCaseRequest,
  idempotencyKey: string,
  signal?: AbortSignal,
) => Promise<{ data: unknown; status: number }>

async function createCaseForBff(
  value: unknown,
  idempotencyKey: string | null,
  writeCase: ClinicalCaseWriter,
  signal?: AbortSignal,
): Promise<CreateCaseResult> {
  if (!idempotencyKey || !z.string().uuid().safeParse(idempotencyKey).success) {
    return failure(400, "VALIDATION_ERROR", false)
  }

  const parsed = CreateCaseSchema.safeParse(value)
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.flatMap((issue): FieldError[] => {
      const field = String(issue.path[0] ?? "")
      return FIELD_SET.has(field) ? [{ field, type: "invalid" }] : []
    })
    return failure(400, "REQUEST_VALIDATION_ERROR", false, fieldErrors)
  }

  let upstream: Awaited<ReturnType<ClinicalCaseWriter>>
  try {
    const body: CreateCaseRequest = parsed.data
    upstream = await writeCase(body, idempotencyKey, signal)
  } catch (error) {
    return error instanceof SyntaxError
      ? failure(502, "INVALID_RESPONSE", false)
      : failure(503, "SERVICE_UNAVAILABLE", true)
  }

  if (upstream.status === 409) {
    const conflict = z.object({ code: z.literal("IDEMPOTENCY_KEY_REUSED") }).safeParse(upstream.data)
    return conflict.success
      ? failure(409, "IDEMPOTENCY_KEY_REUSED", false)
      : failure(502, "INVALID_RESPONSE", false)
  }
  if (upstream.status === 422) return mapValidationError(upstream.data)
  if (upstream.status === 403) return failure(403, "ACCESS_DENIED", false)
  if (upstream.status === 401 || upstream.status === 429 || upstream.status >= 500) {
    return failure(503, "SERVICE_UNAVAILABLE", true)
  }
  if (upstream.status !== 201) return failure(502, "INVALID_RESPONSE", false)

  const created = parseClinicalCaseDetail(upstream.data)
  return created && created.status === "DRAFT"
    ? { body: created, status: 201 }
    : failure(502, "INVALID_RESPONSE", false)
}

function mapValidationError(value: unknown): CreateCaseResult {
  const parsed = z.object({
    code: z.enum(["REQUEST_VALIDATION_ERROR", "CASE_VALIDATION_ERROR"]),
    details: z.unknown(),
  }).safeParse(value)
  if (!parsed.success) return failure(502, "INVALID_RESPONSE", false)

  if (parsed.data.code === "REQUEST_VALIDATION_ERROR") {
    const details = z.object({ errors: z.array(z.object({ field: z.string(), type: z.string() })) })
      .safeParse(parsed.data.details)
    if (!details.success) return failure(502, "INVALID_RESPONSE", false)
    const fieldErrors = details.data.errors.filter(({ field, type }) =>
      FIELD_SET.has(field) && SAFE_ERROR_TYPE.test(type))
    return failure(422, "REQUEST_VALIDATION_ERROR", false, fieldErrors)
  }

  const details = z.object({ field: z.string().nullable().optional() }).safeParse(parsed.data.details)
  if (!details.success) return failure(502, "INVALID_RESPONSE", false)
  const fieldErrors = details.data.field && FIELD_SET.has(details.data.field)
    ? [{ field: details.data.field, type: "domain" }]
    : []
  return failure(422, "CASE_VALIDATION_ERROR", false, fieldErrors)
}

function failure<Status extends 400 | 403 | 409 | 422 | 502 | 503>(
  status: Status,
  code: CreateCaseErrorCode,
  retryable: boolean,
  fieldErrors?: FieldError[],
): { body: { error: { code: CreateCaseErrorCode; retryable: boolean; fieldErrors?: FieldError[] } }; status: Status } {
  return { body: { error: { code, retryable, ...(fieldErrors ? { fieldErrors } : {}) } }, status }
}

export { createCaseForBff }
