import "server-only"

import type { ClinicalCaseStatus, ListCasesQuery } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

const CASE_STATUSES = ["DRAFT", "IN_PLANNING", "READY", "ARCHIVED"] as const
const QUERY_KEYS = new Set(["limit", "cursor", "status", "search"])

const CaseStatusSchema = z.enum(CASE_STATUSES)
const CaseListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  animal_name: z.string(),
  species: z.string(),
  breed: z.string().nullable(),
  sex: z.enum(["FEMALE", "MALE", "UNKNOWN"]).nullable(),
  status: CaseStatusSchema,
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
})
const ClinicalCaseListSchema = z.object({
  items: z.array(CaseListItemSchema),
  next_cursor: z.string().min(1).max(512).nullable(),
  status_counts: z.object({
    DRAFT: z.number().int().nonnegative().optional(),
    IN_PLANNING: z.number().int().nonnegative().optional(),
    READY: z.number().int().nonnegative().optional(),
    ARCHIVED: z.number().int().nonnegative().optional(),
  }).strict(),
})

type PublicCaseListItem = Readonly<{
  id: string
  title: string
  patient: Readonly<{
    name: string
    species: string
    breed: string | null
    sex: "FEMALE" | "MALE" | "UNKNOWN" | null
  }>
  status: ClinicalCaseStatus
  createdAt: string
  updatedAt: string
}>

type PublicCaseList = Readonly<{
  items: readonly PublicCaseListItem[]
  nextCursor: string | null
  statusCounts: Partial<Record<ClinicalCaseStatus, number>>
}>

type CaseListErrorCode = "ACCESS_DENIED" | "INVALID_RESPONSE" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR"
type CaseListResult =
  | { body: PublicCaseList; status: 200 }
  | { body: { error: { code: CaseListErrorCode; retryable: boolean } }; status: 400 | 403 | 502 | 503 }

type ClinicalListReader = (
  query: ListCasesQuery,
  signal?: AbortSignal,
) => Promise<{ data: unknown; status: number }>

function parseCaseListQuery(searchParams: URLSearchParams): ListCasesQuery | undefined {
  for (const key of searchParams.keys()) {
    if (!QUERY_KEYS.has(key) || searchParams.getAll(key).length !== 1) return undefined
  }

  const limit = searchParams.get("limit")
  const cursor = searchParams.get("cursor")
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  if (limit !== null && (!/^[1-9]\d*$/.test(limit) || Number(limit) > 100)) return undefined
  if (cursor !== null && (cursor.length === 0 || cursor.length > 512)) return undefined
  if (status !== null && !CaseStatusSchema.safeParse(status).success) return undefined
  if (search !== null && Array.from(search).length > 200) return undefined

  return {
    ...(limit !== null ? { limit: Number(limit) } : {}),
    ...(cursor !== null ? { cursor } : {}),
    ...(status !== null ? { status: status as ClinicalCaseStatus } : {}),
    ...(search !== null ? { search } : {}),
  }
}

function parseClinicalCaseList(value: unknown): PublicCaseList | undefined {
  const result = ClinicalCaseListSchema.safeParse(value)
  if (!result.success) return undefined

  return {
    items: result.data.items.map((item) => ({
      id: item.id,
      title: item.title,
      patient: {
        name: item.animal_name,
        species: item.species,
        breed: item.breed,
        sex: item.sex,
      },
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
    nextCursor: result.data.next_cursor,
    statusCounts: result.data.status_counts,
  }
}

async function listCasesForBff(
  searchParams: URLSearchParams,
  readCases: ClinicalListReader,
  signal?: AbortSignal,
): Promise<CaseListResult> {
  const query = parseCaseListQuery(searchParams)
  if (!query) return failure(400, "VALIDATION_ERROR", false)

  let upstream: Awaited<ReturnType<ClinicalListReader>>
  try {
    upstream = await readCases(query, signal)
  } catch (error) {
    return error instanceof SyntaxError
      ? failure(502, "INVALID_RESPONSE", false)
      : failure(503, "SERVICE_UNAVAILABLE", true)
  }

  if (upstream.status === 422) return failure(400, "VALIDATION_ERROR", false)
  if (upstream.status === 403) return failure(403, "ACCESS_DENIED", false)
  // In local identity mode, a clinical 401 cannot invalidate the BFF's own session.
  if (upstream.status === 401 || upstream.status === 429 || upstream.status >= 500) {
    return failure(503, "SERVICE_UNAVAILABLE", true)
  }
  if (upstream.status !== 200) return failure(502, "INVALID_RESPONSE", false)

  const body = parseClinicalCaseList(upstream.data)
  return body ? { body, status: 200 } : failure(502, "INVALID_RESPONSE", false)
}

function failure<Status extends 400 | 403 | 502 | 503>(
  status: Status,
  code: CaseListErrorCode,
  retryable: boolean,
): { body: { error: { code: CaseListErrorCode; retryable: boolean } }; status: Status } {
  return { body: { error: { code, retryable } }, status }
}

export { listCasesForBff, parseCaseListQuery, parseClinicalCaseList }
export type { PublicCaseList }
