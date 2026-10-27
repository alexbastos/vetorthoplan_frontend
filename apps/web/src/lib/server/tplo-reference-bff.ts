import "server-only"

import { z } from "zod"
import { TploClinicalProtocolSchema, TploRotationQuerySchema, TploRotationTableSchema, type TploRotationQuery } from "../../features/cases/schemas/tplo-reference.schema"

type Read = (signal?: AbortSignal) => Promise<{ status: number; data: unknown }>
const failure = (status: number, code: string) => ({ status, body: { error: { code, retryable: status === 503 } } })

async function readReference<T>(read: Read, schema: z.ZodType<T>, signal?: AbortSignal) {
  try {
    if (signal?.aborted) return failure(503, "SERVICE_UNAVAILABLE")
    const result = await read(signal)
    if (result.status !== 200) return result.status === 403 ? failure(403, "ACCESS_DENIED")
      : result.status === 422 ? failure(422, "VALIDATION_ERROR") : failure(503, "SERVICE_UNAVAILABLE")
    const parsed = schema.safeParse(result.data)
    return parsed.success ? { status: 200, body: parsed.data } : failure(502, "INVALID_RESPONSE")
  } catch (error) { return error instanceof SyntaxError ? failure(502, "INVALID_RESPONSE") : failure(503, "SERVICE_UNAVAILABLE") }
}

function getTploClinicalProtocolForBff(read: Read, signal?: AbortSignal) {
  return readReference(read, TploClinicalProtocolSchema, signal)
}

function getTploRotationTableForBff(value: unknown, read: (query: TploRotationQuery, signal?: AbortSignal) => ReturnType<Read>, signal?: AbortSignal) {
  const query = TploRotationQuerySchema.safeParse(value)
  return query.success ? readReference(passed => read(query.data, passed), TploRotationTableSchema, signal)
    : Promise.resolve(failure(400, "VALIDATION_ERROR"))
}

export { getTploClinicalProtocolForBff, getTploRotationTableForBff }
