import { hasUniquePlanObjectIds } from "../schemas/image-plan-command.schema"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { circleHasValidRadius } from "./circle-geometry"

type CircleObject = Extract<ImagePlan["document"]["objects"][number], { type: "CIRCLE" }>
type CircleValues = { radius: number; diameter: number; circumference: number }
type CircleMeasure = keyof CircleValues
const DEFAULT_CIRCLE_MEASURE: CircleMeasure = "diameter"

function isCircleMeasure(value: unknown): value is CircleMeasure {
  return value === "radius" || value === "diameter" || value === "circumference"
}

function circleMeasureFor(id: string, measures?: Readonly<Record<string, CircleMeasure>>, fallback: CircleMeasure = DEFAULT_CIRCLE_MEASURE): CircleMeasure {
  const measure = measures?.[id.toLowerCase()]
  return isCircleMeasure(measure) ? measure : fallback
}

type CircleResult =
  | { status: "available"; values: CircleValues }
  | { status: "unavailable"; reason: "missing" | "calibration" | "dimensions" | "outdated" | "invalid" | "unverified" | "ambiguous" }

type SavedCircle = { circle: CircleObject; result: CircleResult; ambiguous: boolean }

function isCircleValues(values: Partial<CircleValues> | null | undefined): values is CircleValues {
  return Boolean(values && [values.radius, values.diameter, values.circumference].every(value =>
    typeof value === "number" && Number.isFinite(value) && value > 0))
}

function confirmedCircleResult(circle: CircleObject, calibration: ImagePlan["document"]["calibration"]): CircleResult {
  if (!circleHasValidRadius(circle)) return { status: "unavailable", reason: "invalid" }
  const measurement = circle.measurement
  if (!measurement) return { status: "unavailable", reason: "missing" }
  if (measurement.status === "CALIBRATION_REQUIRED") return { status: "unavailable", reason: "calibration" }
  if (measurement.status === "IMAGE_DIMENSIONS_REQUIRED") return { status: "unavailable", reason: "dimensions" }
  if (!calibration?.result) return { status: "unavailable", reason: "calibration" }
  if (measurement.status !== "CALCULATED") return { status: "unavailable", reason: "invalid" }
  if (!measurement.calibration_id || measurement.calibration_id !== calibration.result.calibration_id) return { status: "unavailable", reason: "outdated" }
  const values = measurement.values
  const validUnits = (["radius", "diameter", "circumference"] as const).every(key => measurement.units?.[key] === "mm")
  return isCircleValues(values) && validUnits ? { status: "available", values: { radius: values.radius, diameter: values.diameter, circumference: values.circumference } }
    : { status: "unavailable", reason: "invalid" }
}

function selectSavedCircles(plan: ImagePlan | undefined, { readError = false, dimensionsAvailable = true }: { readError?: boolean; dimensionsAvailable?: boolean } = {}): SavedCircle[] {
  if (!plan) return []
  const uniqueIds = hasUniquePlanObjectIds(plan.document)
  const counts = new Map<string, number>()
  for (const object of plan.document.objects) {
    const key = object.id.toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return plan.document.objects.filter((object): object is CircleObject => object.type === "CIRCLE" && object.visible !== false)
    .map(circle => ({ circle, ambiguous: (counts.get(circle.id.toLowerCase()) ?? 0) > 1,
      result: readError ? { status: "unavailable", reason: "unverified" }
        : !uniqueIds ? { status: "unavailable", reason: "ambiguous" }
          : !dimensionsAvailable ? { status: "unavailable", reason: "dimensions" } : confirmedCircleResult(circle, plan.document.calibration) }))
}

export { DEFAULT_CIRCLE_MEASURE, circleMeasureFor, confirmedCircleResult, isCircleMeasure, isCircleValues, selectSavedCircles }
export type { CircleObject, CircleValues, CircleMeasure, CircleResult, SavedCircle }
