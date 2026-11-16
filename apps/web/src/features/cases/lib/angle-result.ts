import type { ImagePlan } from "../schemas/image-plan.schema"
import { angleHasValidArms } from "./angle-geometry"

type AngleObject = Extract<ImagePlan["document"]["objects"][number], { type: "ANGLE" }>
type AngleResult =
  | { status: "available"; degrees: number }
  | { status: "unavailable"; reason: "missing" | "calibration" | "dimensions" | "invalid" | "unverified" }
type SavedAngle = { angle: AngleObject; result: AngleResult }

function isAngleDegrees(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 180
}

function confirmedAngleResult(angle: AngleObject): AngleResult {
  if (!angleHasValidArms(angle)) return { status: "unavailable", reason: "invalid" }
  const measurement = angle.measurement
  if (!measurement) return { status: "unavailable", reason: "missing" }
  if (measurement.status === "CALIBRATION_REQUIRED") return { status: "unavailable", reason: "calibration" }
  if (measurement.status === "IMAGE_DIMENSIONS_REQUIRED") return { status: "unavailable", reason: "dimensions" }
  // The inspected ANGLE derivation has no calibration fingerprint dependency.
  return measurement.status === "CALCULATED" && isAngleDegrees(measurement.values?.angle) && measurement.units?.angle === "degrees"
    ? { status: "available", degrees: measurement.values.angle } : { status: "unavailable", reason: "invalid" }
}

function selectSavedAngles(plan: ImagePlan | undefined, { readError = false }: { readError?: boolean } = {}): SavedAngle[] {
  if (!plan) return []
  const uniqueIds = new Set(plan.document.objects.map(object => object.id.toLowerCase())).size === plan.document.objects.length
  return plan.document.objects.filter((object): object is AngleObject => object.type === "ANGLE" && object.visible !== false)
    .map(angle => ({ angle, result: readError ? { status: "unavailable", reason: "unverified" }
      : !uniqueIds ? { status: "unavailable", reason: "invalid" } : confirmedAngleResult(angle) }))
}

export { confirmedAngleResult, isAngleDegrees, selectSavedAngles }
export type { AngleObject, AngleResult, SavedAngle }
