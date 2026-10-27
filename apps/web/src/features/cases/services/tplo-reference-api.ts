import { z } from "zod"

import { TploClinicalProtocolSchema, TploRotationQuerySchema, TploRotationTableSchema, type TploRotationQuery } from "../schemas/tplo-reference.schema"
import { caseFetch } from "./case-fetch"

type Options = { fetchImpl?: typeof fetch; signal?: AbortSignal }
const errorSchema = z.object({ error: z.object({ code: z.enum(["ACCESS_DENIED", "SESSION_UNAVAILABLE", "REQUEST_NOT_ALLOWED",
  "CLINICAL_CONTEXT_CHANGED", "CLINICAL_ORGANIZATION_REQUIRED", "SERVICE_UNAVAILABLE", "VALIDATION_ERROR", "INVALID_RESPONSE"]) }) })
class TploReferenceError extends Error {
  readonly code: string
  constructor(code: string) { super(code); this.name = "TploReferenceError"; this.code = code }
}

async function read<T>(url: string, schema: z.ZodType<T>, options: Options): Promise<T> {
  let response: Response
  try { response = await (options.fetchImpl ?? caseFetch)(url, { method: "GET", credentials: "same-origin", cache: "no-store", signal: options.signal }) }
  catch (error) { if (options.signal?.aborted) throw error; throw new TploReferenceError("SERVICE_UNAVAILABLE") }
  let body: unknown
  try { body = await response.json() } catch { throw new TploReferenceError("INVALID_RESPONSE") }
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError")
  if (response.status !== 200) {
    const error = errorSchema.safeParse(body)
    throw new TploReferenceError(error.success ? error.data.error.code : "INVALID_RESPONSE")
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new TploReferenceError("INVALID_RESPONSE")
  return parsed.data
}

function fetchTploClinicalProtocol(options: Options = {}) {
  return read("/api/cases/tplo/clinical-protocol", TploClinicalProtocolSchema, options)
}

function fetchTploRotationTable(value: TploRotationQuery = {}, options: Options = {}) {
  const query = TploRotationQuerySchema.safeParse(value)
  if (!query.success) return Promise.reject(new TploReferenceError("VALIDATION_ERROR"))
  const params = new URLSearchParams(Object.entries(query.data).map(([key, value]) => [key, String(value)]))
  return read(`/api/cases/tplo/rotation-table${params.size ? `?${params}` : ""}`, TploRotationTableSchema, options)
}

export { fetchTploClinicalProtocol, fetchTploRotationTable, TploReferenceError }
