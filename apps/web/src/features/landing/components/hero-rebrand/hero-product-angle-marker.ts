import { formatAngleDegrees } from "../../../cases/lib/angle-format"
import { placeOverlayLabel, type LabelObstacle } from "../../../cases/lib/distance-overlay-labels"
import type { DistanceIntersection } from "../../../cases/lib/distance-placement"
import { heroRadiograph } from "./hero-product-measurements"

// Same arc sizing, right-angle corner, and label search as DistanceOverlay.
function heroAngleMarker(arc: DistanceIntersection, scale: number, locale: string, obstacles: readonly LabelObstacle[]) {
  const pixel = 1 / scale, rightAngle = Math.abs(Math.abs(arc.sweep) - Math.PI / 2) < 1e-10
  const radius = Math.min((rightAngle ? 16 : 22) * pixel, arc.room)
  if (radius < 4 * pixel) return null
  const at = (angle: number, distance = radius) => ({ x: arc.center.x + Math.cos(angle) * distance, y: arc.center.y + Math.sin(angle) * distance })
  const start = at(arc.start), end = at(arc.start + arc.sweep)
  const corner = { x: start.x + end.x - arc.center.x, y: start.y + end.y - arc.center.y }
  const path = rightAngle ? `M ${start.x} ${start.y} L ${corner.x} ${corner.y} L ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${arc.sweep > 0 ? 1 : 0} ${end.x} ${end.y}`
  const value = formatAngleDegrees(arc.degrees, (number, options) => new Intl.NumberFormat(locale, options).format(number))
  const edge = rightAngle ? Math.SQRT2 * radius : radius
  let label: { x: number; y: number } | undefined
  // Try the platform positions first, then allow room for longer Hero segments.
  for (const offset of [12, 20, 28, 36, 44, 52]) {
    for (const fraction of [0.5, 0.32, 0.68, 0.2, 0.8]) {
      const candidate = placeOverlayLabel(at(arc.start + arc.sweep * fraction, edge + offset * pixel), value, 0, pixel, heroRadiograph, [], obstacles)
      if (candidate) { label = candidate.point; break }
    }
    if (label) break
  }
  return { path, label, value, degrees: arc.degrees, fontSize: 11 * pixel, strokeWidth: 1.5 * pixel }
}

export { heroAngleMarker }
