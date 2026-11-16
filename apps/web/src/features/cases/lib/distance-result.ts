import type { ImagePlan } from "../schemas/image-plan.schema"

type DistanceLine = Extract<ImagePlan["document"]["objects"][number], { type: "LINE" }>
type DistanceResult =
  | { status: "available"; lengthMm: number }
  | { status: "unavailable"; reason: "missing" | "calibration" | "dimensions" | "outdated" | "invalid" | "unverified" }
type SavedDistance = { line: DistanceLine; result: DistanceResult }

function confirmedDistanceResult(line: DistanceLine, calibration: ImagePlan["document"]["calibration"]): DistanceResult {
  const measurement = line.measurement
  if (!measurement) return { status: "unavailable", reason: "missing" }
  if (measurement.status === "CALIBRATION_REQUIRED" || !calibration?.result) return { status: "unavailable", reason: "calibration" }
  if (measurement.status === "IMAGE_DIMENSIONS_REQUIRED") return { status: "unavailable", reason: "dimensions" }
  if (measurement.status !== "CALCULATED") return { status: "unavailable", reason: "invalid" }
  if (!measurement.calibration_id || measurement.calibration_id !== calibration.result.calibration_id) return { status: "unavailable", reason: "outdated" }
  const lengthMm = measurement.values?.length
  return typeof lengthMm === "number" && Number.isFinite(lengthMm) && lengthMm > 0 && measurement.units?.length === "mm"
    ? { status: "available", lengthMm } : { status: "unavailable", reason: "invalid" }
}

function selectSavedDistances(plan: ImagePlan | undefined, { readError = false }: { readError?: boolean } = {}): SavedDistance[] {
  return plan ? plan.document.objects.filter((object): object is DistanceLine => object.type === "LINE" && object.visible !== false)
    .map(line => ({ line, result: readError ? { status: "unavailable", reason: "unverified" } : confirmedDistanceResult(line, plan.document.calibration) })) : []
}

export { confirmedDistanceResult, selectSavedDistances }
export type { DistanceLine, DistanceResult, SavedDistance }
