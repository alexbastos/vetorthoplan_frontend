import type { CalibrationMarker, ImagePoint } from "../types/case-workspace"
import { moveLineMarker } from "./line-marker-interaction"

type CircleMarker = Extract<CalibrationMarker, { kind: "circle" }>
type CircleHit = "start" | "end" | "edge" | "body" | null
type ImageRect = Readonly<{ left: number; top: number; width: number; height: number }>

function circleDiameter(marker: CircleMarker) {
  const end = marker.edge ?? { x: marker.center.x + marker.radiusPx, y: marker.center.y }
  return { start: { x: 2 * marker.center.x - end.x, y: 2 * marker.center.y - end.y }, end }
}

function circleFromDiameter(start: ImagePoint, end: ImagePoint): CircleMarker {
  return { kind: "circle", center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }, edge: end,
    radiusPx: Math.hypot(end.x - start.x, end.y - start.y) / 2 }
}

function resizeCircleDiameter(marker: CircleMarker, endpoint: "start" | "end", point: ImagePoint,
  imageWidth: number, imageHeight: number, edgeInset = 1): CircleMarker {
  const diameter = circleDiameter(marker), fixed = endpoint === "start" ? diameter.end : diameter.start
  // The opposite diameter point may be outside the image in a valid saved
  // circle. Keep that point fixed while bounding the API's center and edge.
  const clamp = (value: number, anchor: number, maximum: number) =>
    Math.max(Math.max(0, -anchor), Math.min(Math.min(maximum, 2 * maximum - anchor), value))
  const moving = { x: clamp(point.x, fixed.x, imageWidth - edgeInset), y: clamp(point.y, fixed.y, imageHeight - edgeInset) }
  return endpoint === "start" ? circleFromDiameter(moving, fixed) : circleFromDiameter(fixed, moving)
}

function hitTestCircleMarker(
  pointer: ImagePoint,
  marker: CircleMarker,
  rect: ImageRect,
  imageWidth: number,
  imageHeight: number,
  options: { diameterHandles?: boolean } = {},
): CircleHit {
  if (rect.width <= 0 || rect.height <= 0 || imageWidth <= 0 || imageHeight <= 0) return null
  if (pointer.x < rect.left || pointer.x > rect.left + rect.width
    || pointer.y < rect.top || pointer.y > rect.top + rect.height) return null

  if (options.diameterHandles) {
    const diameter = circleDiameter(marker)
    const distanceTo = (point: ImagePoint) => Math.hypot(pointer.x - rect.left - point.x / imageWidth * rect.width,
      pointer.y - rect.top - point.y / imageHeight * rect.height)
    const startDistance = distanceTo(diameter.start), endDistance = distanceTo(diameter.end)
    if (startDistance <= 12 || endDistance <= 12) return startDistance <= endDistance ? "start" : "end"
  }

  const centerX = rect.left + marker.center.x / imageWidth * rect.width
  const centerY = rect.top + marker.center.y / imageHeight * rect.height
  const radius = marker.radiusPx / imageWidth * rect.width
  const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY)

  if (distance <= radius * 0.4) return "body"
  if (Math.abs(distance - radius) <= 10) return "edge"
  return distance < radius ? "body" : null
}

function resizeCircleMarker(
  marker: CircleMarker,
  point: ImagePoint,
  imageWidth: number,
  imageHeight: number,
  edgeInset = 1,
): CircleMarker {
  const { x, y } = marker.center
  if (marker.edge) {
    // The API bounds center and edge, not the whole circumference. A reference
    // can be partially outside the image without being an invalid circle.
    const edge = { x: Math.max(0, Math.min(imageWidth - edgeInset, point.x)),
      y: Math.max(0, Math.min(imageHeight - edgeInset, point.y)) }
    return { ...marker, edge, radiusPx: Math.hypot(edge.x - x, edge.y - y) }
  }
  const maxRadius = Math.max(0, Math.min(x, y, imageWidth - edgeInset - x, imageHeight - edgeInset - y))
  return { ...marker, radiusPx: Math.max(0, Math.min(maxRadius, Math.hypot(point.x - x, point.y - y))) }
}

function moveCircleMarker(
  marker: CircleMarker,
  origin: ImagePoint,
  point: ImagePoint,
  imageWidth: number,
  imageHeight: number,
  edgeInset = 1,
): CircleMarker {
  const diameter = circleDiameter(marker)
  // The two diameter controls must remain usable by the subsequent LINE tool.
  // Some legacy references exceed the entire matrix: preserve those until the
  // user explicitly adjusts their endpoints instead of silently shrinking them.
  if (Math.abs(diameter.end.x - diameter.start.x) > imageWidth - edgeInset
    || Math.abs(diameter.end.y - diameter.start.y) > imageHeight - edgeInset) return marker
  const moved = moveLineMarker({ kind: "line", ...diameter }, origin, point, imageWidth, imageHeight, edgeInset)
  return circleFromDiameter(moved.start, moved.end)
}

export { circleDiameter, circleFromDiameter, resizeCircleDiameter, hitTestCircleMarker, moveCircleMarker, resizeCircleMarker }
export type { CircleHit, CircleMarker }
