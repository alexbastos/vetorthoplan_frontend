import { distanceIntersections } from "../../../cases/lib/distance-placement"
import { landmarksValuesPreview } from "../../../cases/lib/landmarks-preview"
import type { LandmarksGeometry } from "../../../cases/lib/landmarks-geometry"
import { heroAngleMarker } from "./hero-product-angle-marker"
import { heroRadiograph } from "./hero-product-measurements"
import type { Point } from "./hero-product-motion-math"

const heroTpaLandmarks = {
  plateau_cranial: { x: 0.4084, y: 0.20864 }, plateau_caudal: { x: 0.61, y: 0.268 },
  intercondylar_midpoint: { x: 0.51, y: 0.205 }, talus_center: { x: 0.47, y: 0.875 },
} satisfies LandmarksGeometry
const heroTpaPoints = Object.values(heroTpaLandmarks)
const heroTpaColors = { line: "var(--radiograph-mark-anatomy)", reference: "var(--radiograph-mark-interest)", angle: "var(--radiograph-mark-comparison)" }
const heroAnnotationScale = 382 / heroRadiograph.heightPx
const pixels = (point: Point): Point => ({ x: point.x * heroRadiograph.widthPx, y: point.y * heroRadiograph.heightPx })
const normalized = (point: Point): Point => ({ x: point.x / heroRadiograph.widthPx, y: point.y / heroRadiograph.heightPx })
type HeroTpaSegment = { start: Point; end: Point; visible: boolean; preview: boolean }

function heroTpaConstruction(placedPoints: number, pointer?: Point, scale = heroAnnotationScale, locale = "pt-BR") {
  const segment = (first: number, second: number): HeroTpaSegment => ({ start: heroTpaPoints[first],
    end: placedPoints > second ? heroTpaPoints[second] : pointer ?? heroTpaPoints[first],
    visible: placedPoints > first, preview: placedPoints > first && placedPoints <= second })
  const plateau = segment(0, 1), axis = segment(2, 3)
  const intersection = plateau.visible && axis.visible ? distanceIntersections([
    { id: "plateau", start: plateau.start, end: plateau.end }, { id: "axis", start: axis.start, end: axis.end },
  ], heroRadiograph)[0] : undefined
  let reference: HeroTpaSegment | undefined
  if (intersection) {
    const a = pixels(axis.start), b = pixels(axis.end), length = Math.hypot(b.x - a.x, b.y - a.y)
    const normal = { x: (b.y - a.y) / length, y: -(b.x - a.x) / length }
    if (normal.x < 0) { normal.x *= -1; normal.y *= -1 }
    const radius = heroRadiograph.widthPx * 0.15, center = intersection.center
    reference = { start: normalized({ x: center.x - normal.x * radius, y: center.y - normal.y * radius }),
      end: normalized({ x: center.x + normal.x * radius, y: center.y + normal.y * radius }), visible: true, preview: false }
  }
  const comparison = reference ? distanceIntersections([
    { id: "plateau", start: plateau.start, end: plateau.end }, { id: "reference", start: reference.start, end: reference.end },
  ], heroRadiograph)[0] : undefined
  const obstacles = [plateau, axis, reference].filter(line => line?.visible).map(line => ({ start: pixels(line!.start), end: pixels(line!.end), padding: 2 / scale }))
  const angle = comparison ? heroAngleMarker(comparison, scale, locale, obstacles) : null
  const previewPoint = plateau.preview || axis.preview ? pointer : undefined
  return { segments: { plateau, axis, reference }, points: heroTpaPoints.map((_, index) => placedPoints > index ? 1 : 0), previewPoint, angle }
}
const heroTpaDegrees = landmarksValuesPreview(heroTpaLandmarks, heroRadiograph)?.tpaDegrees

export { heroTpaLandmarks, heroTpaPoints, heroTpaColors, heroTpaConstruction, heroTpaDegrees, heroAnnotationScale }
export type { HeroTpaSegment }
export type HeroTpaConstruction = ReturnType<typeof heroTpaConstruction>
