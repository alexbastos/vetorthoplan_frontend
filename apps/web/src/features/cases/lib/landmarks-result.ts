import { TploLandmarksInputSchema, type ImagePlan, type TploLandmarksInput } from "../schemas/image-plan.schema"

type LandmarksUnavailableReason = "missing" | "landmarks" | "dimensions" | "method" | "invalid" | "unverified" | "calibration" | "outdated"
type LandmarksTpaResult =
  | { status: "available"; degrees: number }
  | { status: "unavailable"; reason: LandmarksUnavailableReason }
type LandmarksLengthResult =
  | { status: "available"; mm: number }
  | { status: "unavailable"; reason: LandmarksUnavailableReason }
type LandmarksResult = {
  tpa: LandmarksTpaResult
  plateauLength: LandmarksLengthResult
  tibialAxisLength: LandmarksLengthResult
}
type SavedLandmarks = {
  landmarks: TploLandmarksInput
  revision: number
  result: LandmarksResult
  assessment: ImagePlan["document"]["tplo_measurement"]
}

type LandmarksAssessment = ImagePlan["document"]["tplo_measurement"]
type Calibration = ImagePlan["document"]["calibration"]

function unavailableLandmarksResult(reason: LandmarksUnavailableReason): LandmarksResult {
  return {
    tpa: { status: "unavailable", reason },
    plateauLength: { status: "unavailable", reason },
    tibialAxisLength: { status: "unavailable", reason },
  }
}

function isLandmarksTpaDegrees(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 90
}

function isLandmarksLengthMm(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function hasDistinctLandmarkSegments(landmarks: TploLandmarksInput): boolean {
  return (landmarks.plateau_cranial.x !== landmarks.plateau_caudal.x
    || landmarks.plateau_cranial.y !== landmarks.plateau_caudal.y)
    && (landmarks.intercondylar_midpoint.x !== landmarks.talus_center.x
      || landmarks.intercondylar_midpoint.y !== landmarks.talus_center.y)
}

function unavailableLength(reason: LandmarksUnavailableReason): LandmarksLengthResult {
  return { status: "unavailable", reason }
}

function lengthResult(value: unknown, measurement: NonNullable<LandmarksAssessment>, calibration: Calibration): LandmarksLengthResult {
  const fingerprint = calibration?.result?.calibration_id
  if (typeof fingerprint !== "string" || !fingerprint.trim()) return unavailableLength("calibration")
  if (typeof measurement.calibration_id !== "string" || !measurement.calibration_id.trim()
    || measurement.calibration_id !== fingerprint) return unavailableLength("outdated")
  if (value == null) return unavailableLength("missing")
  return isLandmarksLengthMm(value)
    ? { status: "available", mm: value }
    : unavailableLength("invalid")
}

function confirmedLandmarksResult(
  landmarks: TploLandmarksInput,
  assessment: LandmarksAssessment,
  calibration: Calibration,
  { dimensionsAvailable = true }: { dimensionsAvailable?: boolean } = {},
): LandmarksResult {
  if (!TploLandmarksInputSchema.safeParse(landmarks).success) return unavailableLandmarksResult("invalid")
  if (!assessment) return unavailableLandmarksResult("missing")
  if (assessment.method !== landmarks.method) return unavailableLandmarksResult("method")
  if (assessment.status === "LANDMARKS_REQUIRED") return unavailableLandmarksResult("landmarks")
  if (assessment.status === "IMAGE_DIMENSIONS_REQUIRED" || !dimensionsAvailable) return unavailableLandmarksResult("dimensions")
  if (!hasDistinctLandmarkSegments(landmarks)) return unavailableLandmarksResult("landmarks")
  if (assessment.status !== "CALCULATED") return unavailableLandmarksResult("invalid")

  const tpa: LandmarksTpaResult = assessment.tpa_degrees == null
    ? { status: "unavailable", reason: "missing" }
    : isLandmarksTpaDegrees(assessment.tpa_degrees)
      ? { status: "available", degrees: assessment.tpa_degrees }
      : { status: "unavailable", reason: "invalid" }

  return {
    tpa,
    plateauLength: lengthResult(assessment.plateau_length_mm, assessment, calibration),
    tibialAxisLength: lengthResult(assessment.tibial_axis_length_mm, assessment, calibration),
  }
}

function selectSavedLandmarks(
  plan: ImagePlan | undefined,
  { readError = false, dimensionsAvailable = true, expectedImageId }: {
    readError?: boolean
    dimensionsAvailable?: boolean
    expectedImageId?: string
  } = {},
): SavedLandmarks | null {
  if (!plan) return null
  const imageMismatch = expectedImageId !== undefined
    && expectedImageId.toLowerCase() !== plan.imageId.toLowerCase()
  if (imageMismatch) return null

  const saved = plan.document.tplo_landmarks
  if (saved == null) return null

  // Keep the saved geometry visible when a later read for this image fails;
  // only its official result becomes unverified.
  const landmarks = saved
  const assessment = plan.document.tplo_measurement
  const result = readError
    ? unavailableLandmarksResult("unverified")
    : confirmedLandmarksResult(landmarks, assessment, plan.document.calibration, { dimensionsAvailable })

  return { landmarks, revision: plan.revision, result, assessment }
}

export { confirmedLandmarksResult, isLandmarksTpaDegrees, selectSavedLandmarks }
export type { LandmarksLengthResult, LandmarksResult, LandmarksTpaResult, LandmarksUnavailableReason, SavedLandmarks }
