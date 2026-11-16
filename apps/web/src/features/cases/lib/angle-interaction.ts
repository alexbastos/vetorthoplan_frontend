import type { ImagePoint } from "../types/case-workspace"
import { angleHasValidArms, type AngleGeometry } from "./angle-geometry"
import { imagePointToNormalized, imagePointToPixels, type ImageDimensions } from "./image-point-space"
import type { ImageRect } from "./line-marker-interaction"

type AnglePoint = "start" | "vertex" | "end"
type AngleAdjustmentTarget = "body" | AnglePoint
type AngleHit = AngleAdjustmentTarget | null
type AnglePickObject = AngleGeometry & { id: string }
type AngleDrag =
  | { kind: "move-angle"; geometry: AngleGeometry; origin: ImagePoint }
  | { kind: "resize-angle"; geometry: AngleGeometry; point: AnglePoint }
const points = ["start", "vertex", "end"] as const

function mapAngle(geometry: AngleGeometry, map: (point: ImagePoint) => ImagePoint): AngleGeometry {
  return { start: map(geometry.start), vertex: map(geometry.vertex), end: map(geometry.end) }
}

function angleInPixels(geometry: AngleGeometry, dimensions: ImageDimensions): AngleGeometry {
  return mapAngle(geometry, point => imagePointToPixels(point, dimensions))
}

function angleInNormalized(geometry: AngleGeometry, dimensions: ImageDimensions, reference?: AngleGeometry): AngleGeometry {
  const result = mapAngle(geometry, point => imagePointToNormalized(point, dimensions))
  if (reference) {
    const original = angleInPixels(reference, dimensions)
    // Resizing one handle must not round-trip untouched normalized points.
    for (const key of points) if (geometry[key].x === original[key].x && geometry[key].y === original[key].y) result[key] = { ...reference[key] }
  }
  return result
}

function angleGeometryIsValid(geometry: AngleGeometry, { widthPx, heightPx }: ImageDimensions): boolean {
  return Number.isFinite(widthPx) && Number.isFinite(heightPx) && widthPx > 0 && heightPx > 0
    && points.every(key => Number.isFinite(geometry[key].x) && Number.isFinite(geometry[key].y)
      && geometry[key].x >= 0 && geometry[key].x <= widthPx && geometry[key].y >= 0 && geometry[key].y <= heightPx)
    && angleHasValidArms(geometry)
}

function segmentDistance(point: ImagePoint, start: ImagePoint, end: ImagePoint) {
  const dx = end.x - start.x, dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const progress = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0
  return Math.hypot(point.x - start.x - progress * dx, point.y - start.y - progress * dy)
}

function hitTestAngle(pointer: ImagePoint, geometry: AngleGeometry, rect: ImageRect, dimensions: ImageDimensions): AngleHit {
  if (rect.width <= 0 || rect.height <= 0 || !angleGeometryIsValid(geometry, dimensions)
    || pointer.x < rect.left || pointer.x > rect.left + rect.width || pointer.y < rect.top || pointer.y > rect.top + rect.height) return null
  const screen = mapAngle(geometry, point => ({ x: rect.left + point.x / dimensions.widthPx * rect.width,
    y: rect.top + point.y / dimensions.heightPx * rect.height }))
  let nearest: AnglePoint | null = null, distance = Infinity
  for (const key of points) {
    const next = Math.hypot(pointer.x - screen[key].x, pointer.y - screen[key].y)
    if (next <= 12 && next < distance) { nearest = key; distance = next }
  }
  if (nearest) return nearest
  return Math.min(segmentDistance(pointer, screen.start, screen.vertex), segmentDistance(pointer, screen.vertex, screen.end)) <= 8 ? "body" : null
}

function beginAngleDrag(geometry: AngleGeometry, hit: AngleHit, origin: ImagePoint): AngleDrag | null {
  if (!hit) return null
  return hit === "body" ? { kind: "move-angle", geometry, origin } : { kind: "resize-angle", geometry, point: hit }
}

function pickAngle(pointer: ImagePoint, angles: readonly AnglePickObject[], selectedId: string | null, rect: ImageRect, dimensions: ImageDimensions) {
  let nearest: { id: string; part: Exclude<AngleHit, null>; distance: number } | null = null
  const selectedKey = selectedId?.toLowerCase()
  for (const angle of angles) {
    const pixels = angleInPixels(angle, dimensions)
    const part = hitTestAngle(pointer, pixels, rect, dimensions)
    if (!part) continue
    const screen = mapAngle(pixels, point => ({ x: rect.left + point.x / dimensions.widthPx * rect.width,
      y: rect.top + point.y / dimensions.heightPx * rect.height }))
    const distance = Math.min(segmentDistance(pointer, screen.start, screen.vertex), segmentDistance(pointer, screen.vertex, screen.end))
    const hit = { id: angle.id, part, distance }
    if (angle.id.toLowerCase() === selectedKey && part !== "body") return hit
    const preferredTie = nearest && distance === nearest.distance
      && (angle.id.toLowerCase() === selectedKey && nearest.id.toLowerCase() !== selectedKey
        || nearest.id.toLowerCase() !== selectedKey && angle.id.toLowerCase() < nearest.id.toLowerCase())
    if (!nearest || distance < nearest.distance || preferredTie) nearest = hit
  }
  return nearest
}

function angleFromDrag(drag: AngleDrag, point: ImagePoint, dimensions: ImageDimensions): AngleGeometry | null {
  if (!angleGeometryIsValid(drag.geometry, dimensions) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
  let next: AngleGeometry
  if (drag.kind === "resize-angle") next = { ...drag.geometry, [drag.point]: {
    x: Math.max(0, Math.min(dimensions.widthPx, point.x)), y: Math.max(0, Math.min(dimensions.heightPx, point.y)),
  } }
  else {
    const dx = Math.max(-Math.min(...points.map(key => drag.geometry[key].x)), Math.min(
      dimensions.widthPx - Math.max(...points.map(key => drag.geometry[key].x)), point.x - drag.origin.x))
    const dy = Math.max(-Math.min(...points.map(key => drag.geometry[key].y)), Math.min(
      dimensions.heightPx - Math.max(...points.map(key => drag.geometry[key].y)), point.y - drag.origin.y))
    next = mapAngle(drag.geometry, point => ({ x: point.x + dx, y: point.y + dy }))
  }
  return angleGeometryIsValid(next, dimensions) ? next : null
}

function angleFromKeyboard(geometry: AngleGeometry, target: AngleAdjustmentTarget,
  event: { key: string; shiftKey: boolean; altKey: boolean }, dimensions: ImageDimensions, mirrored: boolean): AngleGeometry | null {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return null
  const step = event.shiftKey ? 10 : 1
  const delta = { x: (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0) * (mirrored ? -1 : 1),
    y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0 }
  const part = target === "body" && event.altKey ? "end" : target
  const drag = beginAngleDrag(geometry, part, { x: 0, y: 0 })!
  return angleFromDrag(drag, part === "body" ? delta : { x: geometry[part].x + delta.x, y: geometry[part].y + delta.y }, dimensions)
}

function isAngleDrag(drag: { kind: string }): drag is AngleDrag {
  return drag.kind === "move-angle" || drag.kind === "resize-angle"
}

export { angleInPixels, angleInNormalized, angleGeometryIsValid, hitTestAngle, pickAngle, beginAngleDrag, angleFromDrag, angleFromKeyboard, isAngleDrag }
export type { AngleAdjustmentTarget, AngleHit, AngleDrag, AnglePickObject }
