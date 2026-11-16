import { normalizedAngleRotation, type AngleGeometry } from "./angle-geometry"
import { angleDegreesPreview } from "./angle-preview"

// Construct points in the same normalized basis used by the backend's
// atan2(abs(cross), dot). The requested number is never a derived result.
function angleWithDegrees(geometry: AngleGeometry, degrees: number): AngleGeometry | null {
  if (!Number.isFinite(degrees) || degrees < 0 || degrees > 180) return null
  const rotation = normalizedAngleRotation(geometry)
  if (rotation === null) return null
  if (angleDegreesPreview(geometry) === degrees) return geometry

  const startX = geometry.start.x - geometry.vertex.x
  const startY = geometry.start.y - geometry.vertex.y
  const startLength = Math.hypot(startX, startY)
  const endLength = Math.hypot(geometry.end.x - geometry.vertex.x, geometry.end.y - geometry.vertex.y)
  const radians = degrees * Math.PI / 180
  const cosine = Math.cos(radians)
  // Collinear targets use an exact zero sine to avoid adding a second side.
  const sine = degrees === 0 || degrees === 180 ? 0 : Math.sin(radians) * (rotation < 0 ? -1 : 1)
  const direction = {
    x: (startX * cosine - startY * sine) / startLength,
    y: (startX * sine + startY * cosine) / startLength,
  }

  let limit = Infinity
  for (const axis of ["x", "y"] as const) {
    if (direction[axis] > 0) limit = Math.min(limit, (1 - geometry.vertex[axis]) / direction[axis])
    if (direction[axis] < 0) limit = Math.min(limit, -geometry.vertex[axis] / direction[axis])
  }
  if (!Number.isFinite(limit) || limit <= 0) return null
  // Shorten along the ray, never clamp its axes independently. A small inward
  // margin keeps floating-point addition within the inclusive image bounds.
  const length = Math.min(endLength, limit * (1 - 8 * Number.EPSILON))
  const next: AngleGeometry = {
    start: { ...geometry.start },
    vertex: { ...geometry.vertex },
    end: { x: geometry.vertex.x + direction.x * length, y: geometry.vertex.y + direction.y * length },
  }
  const actual = angleDegreesPreview(next)
  // Evaluate the actual serialized points with the shared backend convention.
  // Reject precision loss at very small arms instead of claiming the target.
  return actual !== null && Math.abs(actual - degrees) <= 1e-8 ? next : null
}

export { angleWithDegrees }
