import type { ImagePlan } from "../schemas/image-plan.schema"
import type { DistanceGeometry } from "./distance-editor"
import type { ImageDimensions } from "./image-point-space"

type DistancePreview = { id: string; geometry: DistanceGeometry; lengthMm: number }

// Display-only estimate from the backend's persisted scale. This never becomes
// a plan measurement or a save payload; the API remains authoritative on save.
function distanceLengthPreview(geometry: DistanceGeometry | null, dimensions: ImageDimensions,
  calibration: ImagePlan["document"]["calibration"]): number | null {
  const scale = calibration?.result?.mm_per_pixel
  if (!geometry || !Number.isFinite(dimensions.widthPx) || !Number.isFinite(dimensions.heightPx)
    || dimensions.widthPx <= 0 || dimensions.heightPx <= 0 || typeof scale !== "number" || !Number.isFinite(scale) || scale <= 0
    || ![geometry.start.x, geometry.start.y, geometry.end.x, geometry.end.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) return null
  const length = Math.hypot((geometry.end.x - geometry.start.x) * dimensions.widthPx,
    (geometry.end.y - geometry.start.y) * dimensions.heightPx) * scale
  return Number.isFinite(length) ? length : null
}

export { distanceLengthPreview }
export type { DistancePreview }
