import type { GetTploClinicalProtocolResponse, GetTploRotationTableQuery, GetTploRotationTableResponse } from "@vetorthoplan/api-client/clinical-contract"
import { z } from "zod"

const finite = z.number().finite()
const TploClinicalProtocolSchema = z.object({
  configured: z.boolean(), protocol_version: z.string().nullable().optional(), source: z.string().nullable().optional(),
  measurements: z.array(z.record(z.string(), z.json())).optional(),
  tpa_max_absolute_error_degrees: finite.positive().max(90).nullable().optional(),
  acceptance_enabled: z.boolean().default(false), clinically_validated: z.literal(false).default(false),
}) satisfies z.ZodType<GetTploClinicalProtocolResponse>
const TploRotationQuerySchema = z.object({
  tpa_degrees: finite.min(0).max(90).optional(), blade_diameter_mm: finite.positive().optional(),
}).strict() satisfies z.ZodType<GetTploRotationTableQuery>
const TploRotationTableSchema = z.object({
  configured: z.boolean(), table_version: z.string().nullable(), source: z.string().nullable(),
  source_url: z.string().nullable().optional(), source_asset_url: z.string().nullable().optional(),
  target_slope_degrees: finite.nullable().optional(), entries_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable().optional(),
  query: z.record(z.string(), finite).optional(), match_count: z.number().int().nonnegative(),
  entries: z.array(z.record(z.string(), z.union([z.string(), finite]))), recommendation_enabled: z.literal(false).default(false),
}) satisfies z.ZodType<GetTploRotationTableResponse>

// URLSearchParams is not a plain object: reject duplicates, blanks and unknown
// fields before numeric conversion instead of silently changing the query.
function parseTploRotationQuery(params: URLSearchParams) {
  const raw: Record<string, number> = {}
  for (const [key, value] of params) {
    if (Object.hasOwn(raw, key) || !["tpa_degrees", "blade_diameter_mm"].includes(key)
      || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return null
    raw[key] = Number(value)
  }
  const parsed = TploRotationQuerySchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export { TploClinicalProtocolSchema, TploRotationQuerySchema, TploRotationTableSchema, parseTploRotationQuery }
export type TploRotationQuery = z.infer<typeof TploRotationQuerySchema>
