import { circleDiameter, circleFromDiameter, moveCircleMarker, resizeCircleDiameter, type CircleHit, type CircleMarker } from "./circle-marker-interaction"
import { moveLineMarker, resizeLineMarker, type LineHit, type LineMarker } from "./line-marker-interaction"
import type { CalibrationMarker, ImagePoint } from "../types/case-workspace"
import type { ImageDimensions } from "./image-point-space"

type MarkerDrag =
  | { kind: "create"; markerKind: CalibrationMarker["kind"]; start: ImagePoint }
  | { kind: "resize-line"; endpoint: "start" | "end"; marker: LineMarker }
  | { kind: "move-line"; marker: LineMarker; origin: ImagePoint }
  | { kind: "resize-circle-diameter"; endpoint: "start" | "end"; marker: CircleMarker }
  | { kind: "move-circle"; marker: CircleMarker; origin: ImagePoint }

function markerFromDrag(drag: MarkerDrag, point: ImagePoint, dimensions: ImageDimensions, edgeInset: number): CalibrationMarker {
  if (drag.kind === "resize-line") return resizeLineMarker(drag.marker, drag.endpoint, point)
  if (drag.kind === "move-line") return moveLineMarker(drag.marker, drag.origin, point, dimensions.widthPx, dimensions.heightPx, edgeInset)
  if (drag.kind === "resize-circle-diameter") return resizeCircleDiameter(drag.marker, drag.endpoint, point, dimensions.widthPx, dimensions.heightPx, edgeInset)
  if (drag.kind === "move-circle") return moveCircleMarker(drag.marker, drag.origin, point, dimensions.widthPx, dimensions.heightPx, edgeInset)
  return drag.markerKind === "line"
    ? { kind: "line", start: drag.start, end: point }
    : circleFromDiameter(drag.start, point)
}

function beginMarkerDrag(marker: CalibrationMarker | null, markerKind: CalibrationMarker["kind"], hit: LineHit | CircleHit, start: ImagePoint): MarkerDrag {
  if (marker?.kind === "line" && markerKind === "line" && (hit === "start" || hit === "end")) {
    return { kind: "resize-line", endpoint: hit, marker }
  } else if (marker?.kind === "line" && markerKind === "line" && hit === "body") {
    return { kind: "move-line", marker, origin: start }
  } else if (marker?.kind === "circle" && markerKind === "circle" && (hit === "start" || hit === "end")) {
    return { kind: "resize-circle-diameter", endpoint: hit, marker }
  } else if (marker?.kind === "circle" && markerKind === "circle" && hit === "edge") {
    const diameter = circleDiameter(marker)
    const endpoint = Math.hypot(start.x - diameter.start.x, start.y - diameter.start.y)
      <= Math.hypot(start.x - diameter.end.x, start.y - diameter.end.y) ? "start" : "end"
    return { kind: "resize-circle-diameter", endpoint, marker }
  } else if (marker?.kind === "circle" && markerKind === "circle" && hit === "body") {
    return { kind: "move-circle", marker, origin: start }
  } else {
    return { kind: "create", markerKind, start }
  }
}

function markerFromKeyboard(marker: CalibrationMarker, event: { key: string; shiftKey: boolean; altKey: boolean }, dimensions: ImageDimensions, edgeInset: number, mirrored: boolean): CalibrationMarker | null {
  const step = event.shiftKey ? 10 : 1
  const delta = { x: event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
    y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0 }
  const sourceDelta = { x: mirrored ? -delta.x : delta.x, y: delta.y }
  const w = dimensions.widthPx, h = dimensions.heightPx
  if (event.altKey) {
    let next: CalibrationMarker
    if (marker.kind === "line") {
      next = resizeLineMarker(marker, "end", {
        x: Math.max(0, Math.min(w - edgeInset, marker.end.x + sourceDelta.x)), y: Math.max(0, Math.min(h - edgeInset, marker.end.y + sourceDelta.y)),
      })
    } else {
      const { end } = circleDiameter(marker)
      next = resizeCircleDiameter(marker, "end", { x: end.x + sourceDelta.x, y: end.y + sourceDelta.y }, w, h, edgeInset)
    }
    if (next.kind === "circle" ? next.radiusPx >= 1 : Math.hypot(next.end.x - next.start.x, next.end.y - next.start.y) >= 2) return next
  } else {
    return marker.kind === "line" ? moveLineMarker(marker, { x: 0, y: 0 }, sourceDelta, w, h, edgeInset)
      : moveCircleMarker(marker, { x: 0, y: 0 }, sourceDelta, w, h, edgeInset)
  }
  return null
}

export { beginMarkerDrag, markerFromDrag, markerFromKeyboard }
export type { MarkerDrag }
