import { simulationSketchGeometry } from "./simulation-sketch-geometry"

type Point = { x: number; y: number }
const round = (value: number) => Number(value.toFixed(3))
const coordinates = (point: Point) => `${round(point.x)} ${round(point.y)}`
const { cut, fragment } = simulationSketchGeometry
const degrees = 15
const radians = degrees * Math.PI / 180
const cosine = Math.cos(radians)
const sine = Math.sin(radians)
const rotate = (point: Point): Point => {
  const dx = point.x - cut.center.x
  const dy = point.y - cut.center.y
  return {
    x: cut.center.x + dx * cosine - dy * sine,
    y: cut.center.y + dx * sine + dy * cosine,
  }
}
const handleDistance = cut.radius + 5 * simulationSketchGeometry.zoom
const edgeLength = Math.hypot(cut.edge.x - cut.center.x, cut.edge.y - cut.center.y)
const handleStart = {
  x: cut.center.x + (cut.edge.x - cut.center.x) / edgeLength * handleDistance,
  y: cut.center.y + (cut.edge.y - cut.center.y) / edgeLength * handleDistance,
}
const handleEnd = rotate(handleStart)
const resultPoints = fragment.points.map(rotate)
const resultWidth = 64
const resultX = 195.5 - resultWidth
const start = .64
const duration = .5
const end = start + duration
const viewOffset = { x: 4, y: 6 }
const viewTransform = `translate(${viewOffset.x} ${viewOffset.y})`
const labelAnchor = { x: resultPoints[5].x + viewOffset.x, y: resultPoints[5].y + viewOffset.y }

// The same rigid transform drives the polygon, clipped bone and handle.
// The cursor follows its circular handle path with the same linear timing.
const rotationSketchGeometry = {
  degrees,
  center: cut.center,
  viewTransform,
  anatomyTransform: `${viewTransform} ${simulationSketchGeometry.anatomyTransform}`,
  origin: coordinates(cut.center),
  finalTransform: `rotate(${degrees} ${coordinates(cut.center)})`,
  resultPointString: resultPoints.map(point => `${round(point.x)},${round(point.y)}`).join(" "),
  handleStart,
  spoke: `M${coordinates(cut.center)}L${coordinates(handleStart)}`,
  handlePath: `M${coordinates(handleStart)}A${round(handleDistance)} ${round(handleDistance)} 0 0 1 ${coordinates(handleEnd)}`,
  pivotReference: `M${round(cut.center.x - 2.2)} ${cut.center.y}H${round(cut.center.x + 2.2)}M${cut.center.x} ${round(cut.center.y - 2.2)}V${round(cut.center.y + 2.2)}`,
  labelConnection: `M${coordinates(labelAnchor)}L${resultX - 6} 105H${resultX - 4}`,
  start, duration, end,
  resultWidth,
} as const

export { rotationSketchGeometry }
