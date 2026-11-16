import type { ImagePoint } from "../types/case-workspace"
import { circleHasValidRadius, type CircleGeometry } from "./circle-geometry"
import { imagePointToNormalized, imagePointToPixels, type ImageDimensions } from "./image-point-space"
import type { ImageRect } from "./line-marker-interaction"

type CircleAdjustmentTarget = "body" | "edge"
type CircleHit = "center" | "edge" | "body" | null
type CirclePickObject = CircleGeometry & { id: string }
type CircleDrag =
  | { kind: "circle-move"; geometry: CircleGeometry; origin: ImagePoint }
  | { kind: "circle-resize"; geometry: CircleGeometry }

function circleInPixels(geometry: CircleGeometry, dimensions: ImageDimensions): CircleGeometry {
  return { center: imagePointToPixels(geometry.center, dimensions), edge: imagePointToPixels(geometry.edge, dimensions) }
}

function circleInNormalized(geometry: CircleGeometry, dimensions: ImageDimensions, reference?: CircleGeometry): CircleGeometry {
  const result = { center: imagePointToNormalized(geometry.center, dimensions), edge: imagePointToNormalized(geometry.edge, dimensions) }
  if (reference) {
    const original = circleInPixels(reference, dimensions)
    for (const key of ["center", "edge"] as const) {
      if (geometry[key].x === original[key].x && geometry[key].y === original[key].y) result[key] = { ...reference[key] }
    }
  }
  return result
}

function circleGeometryIsValid(geometry: CircleGeometry, { widthPx, heightPx }: ImageDimensions): boolean {
  return Number.isFinite(widthPx) && Number.isFinite(heightPx) && widthPx > 0 && heightPx > 0
    && (["center", "edge"] as const).every(key => Number.isFinite(geometry[key].x) && Number.isFinite(geometry[key].y)
      && geometry[key].x >= 0 && geometry[key].x <= widthPx && geometry[key].y >= 0 && geometry[key].y <= heightPx)
    && circleHasValidRadius(geometry)
}

function screenDistances(pointer: ImagePoint, geometry: CircleGeometry, rect: ImageRect, dimensions: ImageDimensions) {
  const screen = (point: ImagePoint) => ({ x: rect.left + point.x / dimensions.widthPx * rect.width,
    y: rect.top + point.y / dimensions.heightPx * rect.height })
  const center = screen(geometry.center), edge = screen(geometry.edge)
  const centerDistance = Math.hypot(pointer.x - center.x, pointer.y - center.y)
  const radius = Math.hypot(geometry.edge.x - geometry.center.x, geometry.edge.y - geometry.center.y) * rect.width / dimensions.widthPx
  return { center: centerDistance, edge: Math.hypot(pointer.x - edge.x, pointer.y - edge.y), rim: Math.abs(centerDistance - radius), radius }
}

function hitTestCircle(pointer: ImagePoint, geometry: CircleGeometry, rect: ImageRect, dimensions: ImageDimensions): CircleHit {
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0
    || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y) || !circleGeometryIsValid(geometry, dimensions)
    || pointer.x < rect.left || pointer.x > rect.left + rect.width || pointer.y < rect.top || pointer.y > rect.top + rect.height) return null
  const distance = screenDistances(pointer, geometry, rect, dimensions)
  if (distance.center <= 12 || distance.edge <= 12) return distance.center <= distance.edge ? "center" : "edge"
  if (distance.rim <= 8) return "edge"
  return distance.center < distance.radius ? "body" : null
}

function pickCircle(pointer: ImagePoint, circles: readonly CirclePickObject[], selectedId: string | null, rect: ImageRect, dimensions: ImageDimensions) {
  let nearest: { id: string; part: Exclude<CircleHit, null>; distance: number } | null = null
  const selectedKey = selectedId?.toLowerCase()
  for (const circle of circles) {
    const pixels = circleInPixels(circle, dimensions)
    const part = hitTestCircle(pointer, pixels, rect, dimensions)
    if (!part) continue
    const distances = screenDistances(pointer, pixels, rect, dimensions)
    const distance = part === "center" ? distances.center : part === "edge" ? Math.min(distances.edge, distances.rim) : distances.rim
    const hit = { id: circle.id, part, distance }
    if (circle.id.toLowerCase() === selectedKey && part !== "body") return hit
    const preferredTie = nearest && distance === nearest.distance
      && (circle.id.toLowerCase() === selectedKey && nearest.id.toLowerCase() !== selectedKey
        || nearest.id.toLowerCase() !== selectedKey && circle.id.toLowerCase() < nearest.id.toLowerCase())
    if (!nearest || distance < nearest.distance || preferredTie) nearest = hit
  }
  return nearest
}

function beginCircleDrag(geometry: CircleGeometry, hit: CircleHit, origin: ImagePoint): CircleDrag | null {
  if (!hit) return null
  return hit === "edge" ? { kind: "circle-resize", geometry } : { kind: "circle-move", geometry, origin }
}

function circleFromDrag(drag: CircleDrag, point: ImagePoint, dimensions: ImageDimensions): CircleGeometry | null {
  if (!circleGeometryIsValid(drag.geometry, dimensions) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
  const { center, edge } = drag.geometry
  let next: CircleGeometry
  if (drag.kind === "circle-resize") next = { center: { ...center }, edge: {
    x: Math.max(0, Math.min(dimensions.widthPx, point.x)), y: Math.max(0, Math.min(dimensions.heightPx, point.y)),
  } }
  else {
    // The API bounds center and edge. The circumference may extend outside the matrix.
    const dx = Math.max(-Math.min(center.x, edge.x), Math.min(dimensions.widthPx - Math.max(center.x, edge.x), point.x - drag.origin.x))
    const dy = Math.max(-Math.min(center.y, edge.y), Math.min(dimensions.heightPx - Math.max(center.y, edge.y), point.y - drag.origin.y))
    next = { center: { x: center.x + dx, y: center.y + dy }, edge: { x: edge.x + dx, y: edge.y + dy } }
  }
  return circleGeometryIsValid(next, dimensions) ? next : null
}

function circleFromKeyboard(geometry: CircleGeometry, target: CircleAdjustmentTarget,
  event: { key: string; shiftKey: boolean; altKey: boolean }, dimensions: ImageDimensions, mirrored: boolean): CircleGeometry | null {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return null
  const step = event.shiftKey ? 10 : 1
  const delta = { x: (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0) * (mirrored ? -1 : 1),
    y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0 }
  const part = target === "body" && event.altKey ? "edge" : target
  const drag = beginCircleDrag(geometry, part, { x: 0, y: 0 })!
  return circleFromDrag(drag, part === "body" ? delta : { x: geometry.edge.x + delta.x, y: geometry.edge.y + delta.y }, dimensions)
}

function isCircleDrag(drag: { kind: string }): drag is CircleDrag {
  return drag.kind === "circle-move" || drag.kind === "circle-resize"
}

export { circleInPixels, circleInNormalized, circleGeometryIsValid, hitTestCircle, pickCircle, beginCircleDrag, circleFromDrag, circleFromKeyboard, isCircleDrag }
export type { CircleAdjustmentTarget, CircleHit, CircleDrag, CirclePickObject }
