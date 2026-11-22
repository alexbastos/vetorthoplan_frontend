import { z } from "zod"

import { TploParametersInputSchema, type ImagePlan } from "../schemas/image-plan.schema"

type TploParameters = z.infer<typeof TploParametersInputSchema>
type TploParameterPatch = Partial<TploParameters>
type TploParameterFields = Record<keyof TploParameters, string>
type TploMetadata = ImagePlan["document"]["tplo"]
const parameterKeys = ["laterality", "projection", "current_slope_degrees", "target_slope_degrees", "blade_diameter_mm"] as const
const numericKeys = ["current_slope_degrees", "target_slope_degrees", "blade_diameter_mm"] as const

function tploParameterFields(metadata: TploMetadata, patch: TploParameterPatch = {}): TploParameterFields {
  const value = { ...metadata, ...patch }
  return { laterality: value.laterality ?? "", projection: value.projection ?? "UNKNOWN",
    current_slope_degrees: value.current_slope_degrees == null ? "" : String(value.current_slope_degrees),
    target_slope_degrees: value.target_slope_degrees == null ? "" : String(value.target_slope_degrees),
    blade_diameter_mm: value.blade_diameter_mm == null ? "" : String(value.blade_diameter_mm) }
}

function parseTploParameterFields(fields: TploParameterFields) {
  const input: Record<string, unknown> = { laterality: fields.laterality, projection: fields.projection }
  for (const key of numericKeys) {
    const text = fields[key].trim().replace(",", ".")
    input[key] = !text ? null : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ? Number(text) : NaN
  }
  return TploParametersInputSchema.safeParse(input)
}

function tploParameterPatch(fields: TploParameterFields, metadata: TploMetadata): TploParameterPatch | null {
  const parsed = parseTploParameterFields(fields)
  if (!parsed.success) return null
  const patch: Record<string, unknown> = {}
  for (const key of parameterKeys) {
    const before = metadata?.[key] ?? (key === "projection" ? "UNKNOWN" : null)
    if (parsed.data[key] !== before) patch[key] = parsed.data[key]
  }
  return patch as TploParameterPatch
}

export { tploParameterFields, parseTploParameterFields, tploParameterPatch }
export type { TploParameterFields, TploParameterPatch, TploMetadata }
