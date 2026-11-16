import type { ImagePoint } from "../types/case-workspace"

type AngleGeometry = { start: ImagePoint; vertex: ImagePoint; end: ImagePoint }

// Null arms are invalid. Coincident start/end with a different vertex remains
// a valid zero-degree angle, matching the inspected backend validator.
function angleHasValidArms({ start, vertex, end }: AngleGeometry): boolean {
  return (start.x !== vertex.x || start.y !== vertex.y)
    && (end.x !== vertex.x || end.y !== vertex.y)
}

// The published backend uses normalized vectors, not image pixels or spacing.
// Signed rotation is only for SVG orientation; its absolute value is 0..PI.
function normalizedAngleRotation(geometry: AngleGeometry): number | null {
  if (![geometry.start, geometry.vertex, geometry.end].every(point =>
    Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)
    || !angleHasValidArms(geometry)) return null
  const ax = geometry.start.x - geometry.vertex.x, ay = geometry.start.y - geometry.vertex.y
  const bx = geometry.end.x - geometry.vertex.x, by = geometry.end.y - geometry.vertex.y
  const cross = ax * by - ay * bx, dot = ax * bx + ay * by
  // Nonzero arms can still underflow in the products. Do not invent a 0-degree
  // preview from atan2(0, 0), or rescale into a different backend calculation.
  if (!Number.isFinite(cross) || !Number.isFinite(dot) || (cross === 0 && dot === 0)) return null
  return cross === 0 && dot < 0 ? Math.PI : Math.atan2(cross, dot)
}

export { angleHasValidArms, normalizedAngleRotation }
export type { AngleGeometry }
