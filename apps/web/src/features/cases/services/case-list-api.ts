import { caseFetch } from "./case-fetch"
import { z } from "zod"

const CaseStatusSchema = z.enum(["DRAFT", "IN_PLANNING", "READY", "ARCHIVED"])
const CaseListSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    patient: z.object({
      name: z.string(),
      species: z.string(),
      breed: z.string().nullable(),
      sex: z.enum(["FEMALE", "MALE", "UNKNOWN"]).nullable(),
    }),
    status: CaseStatusSchema,
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })),
  nextCursor: z.string().min(1).max(512).nullable(),
  statusCounts: z.object({
    DRAFT: z.number().int().nonnegative().optional(),
    IN_PLANNING: z.number().int().nonnegative().optional(),
    READY: z.number().int().nonnegative().optional(),
    ARCHIVED: z.number().int().nonnegative().optional(),
  }).strict(),
})

type CaseListStatus = z.infer<typeof CaseStatusSchema>
type CaseListPage = z.infer<typeof CaseListSchema>
type CaseListItem = CaseListPage["items"][number]
type CaseListQuery = Readonly<{
  cursor?: string | null
  search?: string
  status?: CaseListStatus | null
}>

class CaseListRequestError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, retryable: boolean) {
    super(code)
    this.name = "CaseListRequestError"
    this.code = code
    this.retryable = retryable
  }
}

async function fetchCaseList(
  query: CaseListQuery,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<CaseListPage> {
  const searchParams = new URLSearchParams({ limit: "20" })
  if (query.cursor) searchParams.set("cursor", query.cursor)
  if (query.status) searchParams.set("status", query.status)
  if (query.search) searchParams.set("search", query.search)

  let response: Response
  try {
    response = await (options.fetchImpl ?? caseFetch)(`/api/cases?${searchParams}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new CaseListRequestError("NETWORK_ERROR", true)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new CaseListRequestError("INVALID_RESPONSE", false)
  }

  if (!response.ok) {
    const parsed = z.object({
      error: z.object({ code: z.string(), retryable: z.boolean() }),
    }).safeParse(body)
    throw new CaseListRequestError(
      parsed.success ? parsed.data.error.code : "SERVICE_UNAVAILABLE",
      parsed.success ? parsed.data.error.retryable : response.status >= 500,
    )
  }

  const parsed = CaseListSchema.safeParse(body)
  if (!parsed.success) throw new CaseListRequestError("INVALID_RESPONSE", false)
  return parsed.data
}

export { CaseListRequestError, fetchCaseList }
export type { CaseListItem, CaseListPage, CaseListQuery, CaseListStatus }
