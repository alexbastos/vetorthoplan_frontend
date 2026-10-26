import type { CalibrationMarker, ImagePoint } from "../types/case-workspace"

type LineMarker = Extract<CalibrationMarker, { kind: "line" }>
type LineHit = "start" | "end" | "body" | null
type ImageRect = Readonly<{ left: number; top: number; width: number; height: number }>

function hitTestLineMarker(
  pointer: ImagePoint,
  marker: LineMarker,
  rect: ImageRect,
  imageWidth: number,
  imageHeight: number,
): LineHit {
  if (rect.width <= 0 || rect.height <= 0 || imageWidth <= 0 || imageHeight <= 0) return null
  if (pointer.x < rect.left || pointer.x > rect.left + rect.width
    || pointer.y < rect.top || pointer.y > rect.top + rect.height) return null

  const toClient = (point: ImagePoint): ImagePoint => ({
    x: rect.left + point.x / imageWidth * rect.width,
    y: rect.top + point.y / imageHeight * rect.height,
  })
  const start = toClient(marker.start)
  const end = toClient(marker.end)
  const startDistance = Math.hypot(pointer.x - start.x, pointer.y - start.y)
  const endDistance = Math.hypot(pointer.x - end.x, pointer.y - end.y)

  if (startDistance <= 12 || endDistance <= 12) {
    return startDistance <= endDistance ? "start" : "end"
  }

  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  if (lengthSquared === 0) return null
  const progress = Math.max(0, Math.min(1,
    ((pointer.x - start.x) * deltaX + (pointer.y - start.y) * deltaY) / lengthSquared))
  const closestX = start.x + progress * deltaX
  const closestY = start.y + progress * deltaY
  return Math.hypot(pointer.x - closestX, pointer.y - closestY) <= 8 ? "body" : null
}

function resizeLineMarker(marker: LineMarker, endpoint: "start" | "end", point: ImagePoint): LineMarker {
  return endpoint === "start"
    ? { kind: "line", start: point, end: marker.end }
    : { kind: "line", start: marker.start, end: point }
}

function moveLineMarker(
  marker: LineMarker,
  origin: ImagePoint,
  point: ImagePoint,
  imageWidth: number,
  imageHeight: number,
  edgeInset = 1,
): LineMarker {
  const dx = Math.max(-Math.min(marker.start.x, marker.end.x), Math.min(
    imageWidth - edgeInset - Math.max(marker.start.x, marker.end.x), point.x - origin.x))
  const dy = Math.max(-Math.min(marker.start.y, marker.end.y), Math.min(
    imageHeight - edgeInset - Math.max(marker.start.y, marker.end.y), point.y - origin.y))
  return {
    kind: "line",
    start: { x: marker.start.x + dx, y: marker.start.y + dy },
    end: { x: marker.end.x + dx, y: marker.end.y + dy },
  }
}

export { hitTestLineMarker, moveLineMarker, resizeLineMarker }
export type { LineHit, LineMarker }
