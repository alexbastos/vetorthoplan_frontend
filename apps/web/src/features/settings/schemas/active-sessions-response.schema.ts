import type { ActiveSessionsResponse } from "@vetorthoplan/api-client"
import { z } from "zod"

const NullableStringSchema = z.string().nullable()
const SessionDateSchema = z.string().datetime({ offset: true })

const ActiveSessionResponseSchema = z.object({
  createdAt: SessionDateSchema,
  deviceName: NullableStringSchema,
  expiresAt: SessionDateSchema,
  id: z.string().trim().min(1).max(256),
  ipAddress: NullableStringSchema,
  isCurrent: z.boolean(),
  lastSeenAt: SessionDateSchema,
  location: z
    .object({
      city: NullableStringSchema,
      countryCode: NullableStringSchema,
      countryName: NullableStringSchema,
      region: NullableStringSchema,
    })
    .nullable(),
  userAgent: NullableStringSchema,
})

const ActiveSessionsResponseSchema: z.ZodType<ActiveSessionsResponse> = z.object({
  sessions: z.array(ActiveSessionResponseSchema),
})

function parseActiveSessionsResponse(value: unknown): ActiveSessionsResponse | undefined {
  const result = ActiveSessionsResponseSchema.safeParse(value)
  return result.success ? result.data : undefined
}

export { parseActiveSessionsResponse }
