import { projectTibiaPoint, tibiaLandmarks } from "../../surgical-planning/sketches/planning-tibia-geometry"
import { planningOsteotomy } from "../../surgical-planning/sketches/planning-sketch-geometry"

type Point = { x: number; y: number }
const round = (value: number) => Number(value.toFixed(3))
const coordinates = (point: Point) => `${point.x} ${point.y}`
const zoom = 1.9
const focus = tibiaLandmarks.intercondylarMidpoint
const origin = { x: 102, y: 72 }
const project = (point: Point): Point => ({
  x: round(origin.x + (point.x - focus.x) * zoom),
  y: round(origin.y + (point.y - focus.y) * zoom),
})

// Explicit manual polygon: proximal tibial outline, caudal exit and two chords
// along the cut. No automatic segmentation or contour fitting is implied.
const points = [
  planningOsteotomy.cranialEntry,
  projectTibiaPoint(185, 174),
  projectTibiaPoint(219, 136),
  projectTibiaPoint(252, 133),
  projectTibiaPoint(303, 143),
  projectTibiaPoint(330, 193),
  projectTibiaPoint(311, 218),
  planningOsteotomy.caudalExit,
  planningOsteotomy.edge,
].map(project)
const edges = points.map((start, index) => {
  const end = points[(index + 1) % points.length]
  return { start, end, length: Math.hypot(end.x - start.x, end.y - start.y) }
})
const totalLength = edges.reduce((length, edge) => length + edge.length, 0)
let coveredLength = 0
const segments = edges.map(edge => {
  const progress = coveredLength / totalLength
  coveredLength += edge.length
  return {
    path: `M${coordinates(edge.start)}L${coordinates(edge.end)}`,
    progress, durationRatio: edge.length / totalLength,
  }
})
const drawingStart = .46
const drawingDuration = .92
const drawingEnd = drawingStart + drawingDuration
const cutEntry = project(planningOsteotomy.cranialEntry)
const cutExit = project(planningOsteotomy.caudalExit)
const cutRadius = round(planningOsteotomy.cutRadius * zoom)

const simulationSketchGeometry = {
  zoom,
  anatomyTransform: `translate(${round(origin.x - focus.x * zoom)} ${round(origin.y - focus.y * zoom)}) scale(${zoom})`,
  contentClip: { x: 25.2, y: 39.2, width: 190.6, height: 88.6 },
  cutReference: `M${coordinates(cutEntry)}A${cutRadius} ${cutRadius} 0 0 0 ${coordinates(cutExit)}`,
  cut: { center: origin, radius: cutRadius, edge: project(planningOsteotomy.edge) },
  fragment: {
    points, segments,
    pointString: points.map(point => `${point.x},${point.y}`).join(" "),
    path: `M${points.map(coordinates).join("L")}Z`,
    pathStops: segments.map(segment => segment.progress).join(","),
    drawingStart, drawingDuration, drawingEnd,
    fillAt: drawingEnd + .04,
    labelAt: drawingEnd + .18,
    labelConnection: `M${coordinates(points[5])}L135 105H139.5`,
  },
} as const

export { simulationSketchGeometry }
