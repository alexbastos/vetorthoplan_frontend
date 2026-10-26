import type { CalibrationMarker, ImagePoint } from "../types/case-workspace"

type CircleMarker = Extract<CalibrationMarker, { kind: "circle" }>
type CircleHit = "edge" | "body" | null
type ImageRect = Readonly<{ left: number; top: number; width: number; height: number }>

function hitTestCircleMarker(
  pointer: ImagePoint,
  marker: CircleMarker,
  rect: ImageRect,
  imageWidth: number,
  imageHeight: number,
): CircleHit {
  if (rect.width <= 0 || rect.height <= 0 || imageWidth <= 0 || imageHeight <= 0) return null
  if (pointer.x < rect.left || pointer.x > rect.left + rect.width
    || pointer.y < rect.top || pointer.y > rect.top + rect.height) return null

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
  const { radiusPx, center } = marker
  if (marker.edge) {
    const { edge } = marker
    const dx = Math.max(-Math.min(center.x, edge.x), Math.min(imageWidth - edgeInset - Math.max(center.x, edge.x), point.x - origin.x))
    const dy = Math.max(-Math.min(center.y, edge.y), Math.min(imageHeight - edgeInset - Math.max(center.y, edge.y), point.y - origin.y))
    return { ...marker, center: { x: center.x + dx, y: center.y + dy }, edge: { x: edge.x + dx, y: edge.y + dy } }
  }
  const dx = Math.max(radiusPx - center.x, Math.min(imageWidth - edgeInset - radiusPx - center.x, point.x - origin.x))
  const dy = Math.max(radiusPx - center.y, Math.min(imageHeight - edgeInset - radiusPx - center.y, point.y - origin.y))
  return { ...marker, center: { x: center.x + dx, y: center.y + dy } }
}

export { hitTestCircleMarker, moveCircleMarker, resizeCircleMarker }
export type { CircleHit, CircleMarker }
