import { normalizedAngleRotation, type AngleGeometry } from "./angle-geometry"

type AnglePreview = { id: string; geometry: AngleGeometry; degrees: number | null }

// Display-only atan2(abs(cross), dot), as in the inspected backend. Keeping
// dimensions, zoom, pan and calibration out of this interface avoids changing
// the convention in rectangular images. Never send this value in a plan write.
function angleDegreesPreview(geometry: AngleGeometry | null): number | null {
  if (!geometry) return null
  const rotation = normalizedAngleRotation(geometry)
  if (rotation === null) return null
  const degrees = Math.abs(rotation) * (180 / Math.PI)
  if (!Number.isFinite(degrees) || degrees > 180 + Number.EPSILON * 180) return null
  // Clamp only floating-point overshoot at the upper bound. Zero is valid.
  return Math.min(180, degrees === 0 ? 0 : degrees)
}

export { angleDegreesPreview }
export type { AnglePreview }
