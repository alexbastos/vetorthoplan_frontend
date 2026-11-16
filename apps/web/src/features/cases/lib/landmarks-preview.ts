import type { ImagePlan } from "../schemas/image-plan.schema"
import type { ImageDimensions } from "./image-point-space"
import type { LandmarksGeometry } from "./landmarks-geometry"

type LandmarksPreviewValues = {
  tpaDegrees: number
  plateauLengthMm: number | null
  tibialAxisLengthMm: number | null
}

type LandmarksPreview = { geometry: LandmarksGeometry; values: LandmarksPreviewValues | null }

function landmarksValuesPreview(
  geometry: LandmarksGeometry | null,
  dimensions: ImageDimensions,
  calibration?: ImagePlan["document"]["calibration"],
): LandmarksPreviewValues | null {
  const { widthPx, heightPx } = dimensions
  if (!geometry || !Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0) return null

  const points = [geometry.plateau_cranial, geometry.plateau_caudal, geometry.intercondylar_midpoint, geometry.talus_center]
  if (!points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)) return null

  const plateauX = (geometry.plateau_caudal.x - geometry.plateau_cranial.x) * widthPx
  const plateauY = (geometry.plateau_caudal.y - geometry.plateau_cranial.y) * heightPx
  const tibialAxisX = (geometry.talus_center.x - geometry.intercondylar_midpoint.x) * widthPx
  const tibialAxisY = (geometry.talus_center.y - geometry.intercondylar_midpoint.y) * heightPx
  const plateauLengthPx = Math.hypot(plateauX, plateauY)
  const tibialAxisLengthPx = Math.hypot(tibialAxisX, tibialAxisY)
  if (![plateauLengthPx, tibialAxisLengthPx].every(length => Number.isFinite(length) && length > 0)) return null

  const dot = plateauX * tibialAxisX + plateauY * tibialAxisY
  const cross = plateauX * tibialAxisY - plateauY * tibialAxisX
  if (!Number.isFinite(dot) || !Number.isFinite(cross) || (dot === 0 && cross === 0)) return null

  const tpaDegrees = Math.atan2(Math.abs(dot), Math.abs(cross)) * (180 / Math.PI)
  if (!Number.isFinite(tpaDegrees) || tpaDegrees < 0 || tpaDegrees > 90) return null

  const mmPerPixel = calibration?.result?.mm_per_pixel
  const scaleIsValid = typeof mmPerPixel === "number" && Number.isFinite(mmPerPixel) && mmPerPixel > 0
  const plateauLengthMm = scaleIsValid ? plateauLengthPx * mmPerPixel : null
  const tibialAxisLengthMm = scaleIsValid ? tibialAxisLengthPx * mmPerPixel : null

  return {
    tpaDegrees,
    plateauLengthMm: typeof plateauLengthMm === "number" && Number.isFinite(plateauLengthMm) && plateauLengthMm > 0
      ? plateauLengthMm : null,
    tibialAxisLengthMm: typeof tibialAxisLengthMm === "number" && Number.isFinite(tibialAxisLengthMm) && tibialAxisLengthMm > 0
      ? tibialAxisLengthMm : null,
  }
}

export { landmarksValuesPreview }
export type { LandmarksPreview, LandmarksPreviewValues }
