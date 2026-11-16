import type { ImagePoint } from "../types/case-workspace"
import type { DistanceGeometry } from "./distance-editor"
import { imagePointToPixels, type ImageDimensions } from "./image-point-space"
import { hitTestLineMarker, lineMarkerScreenDistance, moveLineMarker, resizeLineMarker, type ImageRect, type LineHit, type LineMarker } from "./line-marker-interaction"

type DistanceAdjustmentTarget = "body" | "start" | "end"
type DistancePickLine = DistanceGeometry & { id: string }
type DistancePick = { id: string; part: Exclude<LineHit, null>; distance: number }
type DistanceArrow = { key: string; shiftKey: boolean; altKey: boolean }

function distanceLineHasValidSize(marker: LineMarker, action: "move" | "reshape"): boolean {
  const length = Math.hypot(marker.end.x - marker.start.x, marker.end.y - marker.start.y)
  return Number.isFinite(length) && (action === "move" ? length > 0 : length >= 2)
}

function pickDistanceLine(pointer: ImagePoint, lines: readonly DistancePickLine[], selectedId: string | null, rect: ImageRect, dimensions: ImageDimensions): DistancePick | null {
  let nearest: DistancePick | null = null
  for (const line of lines) {
    const marker: LineMarker = { kind: "line", start: imagePointToPixels(line.start, dimensions), end: imagePointToPixels(line.end, dimensions) }
    const part = hitTestLineMarker(pointer, marker, rect, dimensions.widthPx, dimensions.heightPx)
    if (!part) continue
    const hit = { id: line.id, part, distance: lineMarkerScreenDistance(pointer, marker, rect, dimensions.widthPx, dimensions.heightPx) }
    if (line.id === selectedId && part !== "body") return hit
    const tiePreferred = nearest && hit.distance === nearest.distance
      && (hit.id === selectedId && nearest.id !== selectedId || nearest.id !== selectedId && hit.id.toLowerCase() < nearest.id.toLowerCase())
    if (!nearest || hit.distance < nearest.distance || tiePreferred) nearest = hit
  }
  return nearest
}

function distanceMarkerFromKeyboard(marker: LineMarker, target: DistanceAdjustmentTarget, event: DistanceArrow, dimensions: ImageDimensions, mirrored: boolean): LineMarker | null {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return null
  const step = event.shiftKey ? 10 : 1
  const delta = { x: (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0) * (mirrored ? -1 : 1),
    y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0 }
  const endpoint = target === "body" && event.altKey ? "end" : target
  const next = endpoint === "body" ? moveLineMarker(marker, { x: 0, y: 0 }, delta, dimensions.widthPx, dimensions.heightPx, 0)
    : resizeLineMarker(marker, endpoint, {
      x: Math.max(0, Math.min(dimensions.widthPx, marker[endpoint].x + delta.x)),
      y: Math.max(0, Math.min(dimensions.heightPx, marker[endpoint].y + delta.y)),
    })
  return distanceLineHasValidSize(next, endpoint === "body" ? "move" : "reshape") ? next : null
}

export { pickDistanceLine, distanceMarkerFromKeyboard, distanceLineHasValidSize }
export type { DistanceAdjustmentTarget, DistancePickLine, DistanceArrow }
