import { projectTibiaPoint, tibiaLandmarks } from "./planning-tibia-geometry"

// Decorative placement on the shared source art, not a clinical measurement.
type Point = { x: number; y: number }
const round = (value: number) => Number(value.toFixed(3))
const coordinates = (point: Point) => `${round(point.x)} ${round(point.y)}`
const center = tibiaLandmarks.intercondylarMidpoint
const cranialEntry = projectTibiaPoint(182, 224)
const tuberosity = projectTibiaPoint(185, 174)
const cutRadius = Math.hypot(cranialEntry.x - center.x, cranialEntry.y - center.y)

// This cubic is the actual caudal cortex segment from tibia-tpa-card.svg.
// Find where the circular cut meets it, rather than placing an arbitrary endpoint
// beyond the bone. Bisection is bounded to this fixed, intersected drawing segment.
const cortex = [[277, 299], [268, 340], [267, 380], [269, 422]]
  .map(([x, y]) => projectTibiaPoint(x, y))
function caudalCortexPoint(t: number): Point {
  const u = 1 - t
  return {
    x: u ** 3 * cortex[0].x + 3 * u ** 2 * t * cortex[1].x + 3 * u * t ** 2 * cortex[2].x + t ** 3 * cortex[3].x,
    y: u ** 3 * cortex[0].y + 3 * u ** 2 * t * cortex[1].y + 3 * u * t ** 2 * cortex[2].y + t ** 3 * cortex[3].y,
  }
}
let lower = 0
let upper = 1
for (let index = 0; index < 24; index += 1) {
  const middle = (lower + upper) / 2
  const point = caudalCortexPoint(middle)
  if (Math.hypot(point.x - center.x, point.y - center.y) < cutRadius) lower = middle
  else upper = middle
}
const caudalExit = caudalCortexPoint((lower + upper) / 2)
const edgeAngle = 120 * Math.PI / 180
const edge = { x: center.x + cutRadius * Math.cos(edgeAngle), y: center.y + cutRadius * Math.sin(edgeAngle) }
const oppositeEdge = { x: 2 * center.x - edge.x, y: 2 * center.y - edge.y }
const circleArc = `${round(cutRadius)} ${round(cutRadius)}`
const referenceX = 90
const referenceLabel = { x: 77, y: (tuberosity.y + cranialEntry.y) / 2 + 2.4 }

const planningOsteotomy = {
  // Illustrative millimeter readout; the circle itself fits the decorative art.
  radiusMillimeters: 15,
  center, edge, cutRadius, cranialEntry, caudalExit, referenceLabel,
  radius: `M${coordinates(center)}L${coordinates(edge)}`,
  guideCircle: `M${coordinates(edge)}A${circleArc} 0 1 1 ${coordinates(oppositeEdge)}A${circleArc} 0 1 1 ${coordinates(edge)}`,
  arc: `M${coordinates(cranialEntry)}A${circleArc} 0 0 0 ${coordinates(caudalExit)}`,
  reference: `M${coordinates(tuberosity)}H${referenceX}M${coordinates(cranialEntry)}H${referenceX}M${referenceX} ${round(tuberosity.y)}V${round(cranialEntry.y)}M88.5 ${round(tuberosity.y)}H91.5M88.5 ${round(cranialEntry.y)}H91.5`,
  labelConnection: `M${coordinates(caudalExit)}L129 82H139.5`,
  resultY: 73,
} as const

export { planningOsteotomy }
