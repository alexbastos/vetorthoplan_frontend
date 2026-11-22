import type { ImagePlan } from "../schemas/image-plan.schema"
import type { TploRotationQuery, TploRotationTable } from "../schemas/tplo-reference.schema"
import { selectSavedLandmarks } from "./landmarks-result"

type Correction = NonNullable<ImagePlan["document"]["tplo_correction"]>
type TploCorrectionRead = { status: "available"; correction: Correction; revision: number }
  | { status: "unavailable"; reason: "missing" | "unverified" | "outdated" | "invalid" }
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0

function tploOfficialTpa(plan: ImagePlan | undefined, options: { readError?: boolean; dimensionsAvailable: boolean; expectedImageId: string; anisotropic?: boolean }) {
  if (options.anisotropic) return null
  const saved = selectSavedLandmarks(plan, options)
  return saved?.result.tpa.status === "available" ? saved.result.tpa.degrees : null
}

function readTploCorrection(plan: ImagePlan | undefined, tpa: number | null, unverified = false): TploCorrectionRead {
  if (unverified) return { status: "unavailable", reason: "unverified" }
  const correction = plan?.document.tplo_correction
  if (!plan || !correction) return { status: "unavailable", reason: "missing" }
  if (correction.clinically_validated !== false) return { status: "unavailable", reason: "invalid" }
  if (correction.status === "CALCULATED") {
    if (!positive(correction.rotation_mm) || !positive(correction.blade_diameter_mm) || tpa === null)
      return { status: "unavailable", reason: "invalid" }
    if (correction.preoperative_tpa_degrees !== tpa || correction.blade_diameter_mm !== plan.document.tplo?.blade_diameter_mm
      || plan.document.tplo?.target_slope_degrees != null && correction.target_slope_degrees !== plan.document.tplo.target_slope_degrees)
      return { status: "unavailable", reason: "outdated" }
  }
  return { status: "available", correction, revision: plan.revision }
}

// A table read never becomes an official correction or an osteotomy angle.
// Only display a numeric match when the returned row agrees exactly with both
// requested numbers. Do not round, interpolate or choose a neighbouring row.
function tploTableMatch(data: TploRotationTable, query: Required<TploRotationQuery>) {
  // Without a configured table there is no numeric match to verify. The API
  // may omit its optional filter echo or return an empty one in this state.
  if (!data.configured) return { status: "notConfigured" as const }
  if (data.query && (data.query.tpa_degrees !== query.tpa_degrees || data.query.blade_diameter_mm !== query.blade_diameter_mm))
    return { status: "invalid" as const }
  if (data.match_count !== data.entries.length) return { status: "invalid" as const }
  if (data.match_count === 0 && data.entries.length === 0) return { status: "noMatch" as const }
  if (data.match_count !== 1 || data.entries.length !== 1) return { status: "ambiguous" as const }
  const row = data.entries[0]
  if (row.tpa_degrees !== query.tpa_degrees || row.blade_diameter_mm !== query.blade_diameter_mm || !positive(row.rotation_mm))
    return { status: "invalid" as const }
  return { status: "match" as const, rotationMm: row.rotation_mm }
}

export { tploOfficialTpa, readTploCorrection, tploTableMatch }
export type { TploCorrectionRead }
