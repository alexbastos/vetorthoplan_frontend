import type { ImagePlan } from "../schemas/image-plan.schema"
import { circleHasValidRadius, type CircleGeometry } from "./circle-geometry"
import { isCircleValues, type CircleValues } from "./circle-result"
import type { ImageDimensions } from "./image-point-space"

type CirclePreview = { id: string; geometry: CircleGeometry; values: CircleValues | null }

// Display-only values using the persisted scale and the backend's operation order.
// The save command carries center/edge. The API supplies the official result.
function circleValuesPreview(geometry: CircleGeometry | null, dimensions: ImageDimensions,
  calibration: ImagePlan["document"]["calibration"]): CircleValues | null {
  const scale = calibration?.result?.mm_per_pixel
  if (!geometry || !Number.isFinite(dimensions.widthPx) || !Number.isFinite(dimensions.heightPx)
    || dimensions.widthPx <= 0 || dimensions.heightPx <= 0 || typeof scale !== "number" || !Number.isFinite(scale) || scale <= 0
    || ![geometry.center.x, geometry.center.y, geometry.edge.x, geometry.edge.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)
    || !circleHasValidRadius(geometry)) return null
  const distancePx = Math.hypot((geometry.edge.x - geometry.center.x) * dimensions.widthPx,
    (geometry.edge.y - geometry.center.y) * dimensions.heightPx)
  const diameter = 2 * distancePx * scale
  const values = { diameter, radius: diameter / 2, circumference: Math.PI * diameter }
  return isCircleValues(values) ? values : null
}

export { circleValuesPreview }
export type { CirclePreview }
