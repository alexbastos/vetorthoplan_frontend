import { tibiaLandmarks } from "./planning-tibia-geometry"

type Point = { x: number; y: number }
const round = (value: number) => Number(value.toFixed(3))
const coordinates = (point: Point) => `${round(point.x)} ${round(point.y)}`
const segment = (start: Point, end: Point) => `M${coordinates(start)}L${coordinates(end)}`
const offset = (point: Point, direction: Point, distance: number): Point => ({
  x: point.x + direction.x * distance,
  y: point.y + direction.y * distance,
})
const cross = (first: Point, second: Point) => first.x * second.y - first.y * second.x

const cranial = tibiaLandmarks.plateauCranial
const caudal = tibiaLandmarks.plateauCaudal
const joint = tibiaLandmarks.intercondylarMidpoint
const distal = tibiaLandmarks.talusCenter
const axisVector = { x: distal.x - joint.x, y: distal.y - joint.y }
const plateauVector = { x: caudal.x - cranial.x, y: caudal.y - cranial.y }
const axisLength = Math.hypot(axisVector.x, axisVector.y)
const plateauLength = Math.hypot(plateauVector.x, plateauVector.y)
const axisDirection = { x: axisVector.x / axisLength, y: axisVector.y / axisLength }
const plateauDirection = { x: plateauVector.x / plateauLength, y: plateauVector.y / plateauLength }
const perpendicularDirection = { x: axisDirection.y, y: -axisDirection.x }
// Lift the displayed axis handle along the same line, keeping it separate from
// the plateau handles without changing the anatomical axis or the TPA.
const axisStart = offset(joint, axisDirection, -7)

// Place the perpendicular at the intersection of the actual axis and plateau,
// rather than treating either the blue axis or its perpendicular as vertical.
const toPlateau = { x: cranial.x - joint.x, y: cranial.y - joint.y }
const intersection = offset(joint, axisVector, cross(toPlateau, plateauVector) / cross(axisVector, plateauVector))
const perpendicularStart = offset(intersection, perpendicularDirection, -12)
const perpendicularEnd = offset(intersection, perpendicularDirection, 24)
const plateauExtensionEnd = offset(intersection, plateauDirection, 24)
const plateauDisplayLength = Math.hypot(plateauExtensionEnd.x - cranial.x, plateauExtensionEnd.y - cranial.y)

// Same dot/cross definition as cases/lib/landmarks-preview.ts, applied in the
// displayed SVG space. This accounts for the intentionally widened anatomy.
const dot = plateauVector.x * axisVector.x + plateauVector.y * axisVector.y
const tpaDegrees = Math.round(Math.atan2(Math.abs(dot), Math.abs(cross(plateauVector, axisVector))) * 180 / Math.PI * 10) / 10
const arcRadius = 16
const arcStart = offset(intersection, perpendicularDirection, arcRadius)
const arcEnd = offset(intersection, plateauDirection, arcRadius)
const sweep = cross(perpendicularDirection, plateauDirection) >= 0 ? 1 : 0
const middleDirection = {
  x: perpendicularDirection.x + plateauDirection.x,
  y: perpendicularDirection.y + plateauDirection.y,
}
const middleLength = Math.hypot(middleDirection.x, middleDirection.y)
const leaderStart = offset(intersection, { x: middleDirection.x / middleLength, y: middleDirection.y / middleLength }, arcRadius + 1.5)

const planningTpaGeometry = {
  cranial, caudal, axisStart, distal, intersection, tpaDegrees,
  arcLabelAnchor: leaderStart,
  axis: segment(axisStart, distal),
  // Both references have their final length during their first drawing pass.
  // The anatomical caudal handle appears when the cursor passes that landmark.
  plateau: segment(cranial, plateauExtensionEnd),
  plateauCaudalProgress: plateauLength / plateauDisplayLength,
  perpendicular: segment(perpendicularStart, perpendicularEnd),
  angle: `M${coordinates(arcStart)}A${arcRadius} ${arcRadius} 0 0 ${sweep} ${coordinates(arcEnd)}`,
  labelConnection: `M${coordinates(leaderStart)}L134 70H139.5`,
  resultY: 61,
} as const

export { planningTpaGeometry }
