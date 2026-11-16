import type { ImagePoint } from "../types/case-workspace"
import { LANDMARK_POINT_NAMES, type LandmarksPointName } from "./landmarks-editor"
import { landmarksGeometryIsValid, type LandmarksGeometry } from "./landmarks-geometry"
import type { ImageDimensions } from "./image-point-space"
import type { ImageRect } from "./line-marker-interaction"

type LandmarksAdjustmentTarget = "body" | LandmarksPointName
type LandmarksHit = LandmarksAdjustmentTarget | null
type LandmarksDrag =
  | { kind: "move-landmarks"; geometry: LandmarksGeometry; origin: ImagePoint }
  | { kind: "resize-landmarks"; geometry: LandmarksGeometry; point: LandmarksPointName }

const segmentPairs = [
  ["plateau_cranial", "plateau_caudal"],
  ["intercondylar_midpoint", "talus_center"],
] as const

function landmarksScreenPoint(point: ImagePoint, rect: ImageRect, dimensions: ImageDimensions): ImagePoint {
  return {
    x: rect.left + point.x / dimensions.widthPx * rect.width,
    y: rect.top + point.y / dimensions.heightPx * rect.height,
  }
}

function segmentDistance(pointer: ImagePoint, start: ImagePoint, end: ImagePoint): number {
  const dx = end.x - start.x, dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const progress = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((pointer.x - start.x) * dx + (pointer.y - start.y) * dy) / lengthSquared))
  return Math.hypot(pointer.x - start.x - progress * dx, pointer.y - start.y - progress * dy)
}

function hitTestLandmarks(
  pointer: ImagePoint,
  geometry: LandmarksGeometry,
  rect: ImageRect,
  dimensions: ImageDimensions,
  preferredPoint?: LandmarksPointName,
): LandmarksHit {
  if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top) || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)
    || rect.width <= 0 || rect.height <= 0 || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)
    || !landmarksGeometryIsValid(geometry, dimensions)
    || pointer.x < rect.left || pointer.x > rect.left + rect.width || pointer.y < rect.top || pointer.y > rect.top + rect.height) return null

  const screen = Object.fromEntries(LANDMARK_POINT_NAMES.map(key => [key, landmarksScreenPoint(geometry[key], rect, dimensions)])) as Record<LandmarksPointName, ImagePoint>
  let nearest: LandmarksPointName | null = null
  let nearestDistance = Infinity
  for (const key of LANDMARK_POINT_NAMES) {
    const point = screen[key]
    const distance = Math.hypot(pointer.x - point.x, pointer.y - point.y)
    // A selected coincident handle wins ties without hiding a closer point.
    if (distance <= 12 && (distance < nearestDistance || distance === nearestDistance && key === preferredPoint)) {
      nearest = key
      nearestDistance = distance
    }
  }
  if (nearest) return nearest

  const bodyDistance = Math.min(...segmentPairs.map(([startKey, endKey]) =>
    segmentDistance(pointer, screen[startKey], screen[endKey])))
  return bodyDistance <= 8 ? "body" : null
}

function beginLandmarksDrag(geometry: LandmarksGeometry, hit: LandmarksHit, origin: ImagePoint): LandmarksDrag | null {
  if (!hit) return null
  return hit === "body"
    ? { kind: "move-landmarks", geometry, origin }
    : { kind: "resize-landmarks", geometry, point: hit }
}

function landmarksFromDrag(drag: LandmarksDrag, point: ImagePoint, dimensions: ImageDimensions): LandmarksGeometry | null {
  if (!landmarksGeometryIsValid(drag.geometry, dimensions) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null

  let next: LandmarksGeometry
  if (drag.kind === "resize-landmarks") {
    next = {
      ...drag.geometry,
      [drag.point]: {
        x: Math.max(0, Math.min(dimensions.widthPx, point.x)),
        y: Math.max(0, Math.min(dimensions.heightPx, point.y)),
      },
    }
  } else {
    const xValues = LANDMARK_POINT_NAMES.map(key => drag.geometry[key].x)
    const yValues = LANDMARK_POINT_NAMES.map(key => drag.geometry[key].y)
    const dx = Math.max(-Math.min(...xValues), Math.min(dimensions.widthPx - Math.max(...xValues), point.x - drag.origin.x))
    const dy = Math.max(-Math.min(...yValues), Math.min(dimensions.heightPx - Math.max(...yValues), point.y - drag.origin.y))
    next = Object.fromEntries(LANDMARK_POINT_NAMES.map(key => [key, {
      x: drag.geometry[key].x + dx,
      y: drag.geometry[key].y + dy,
    }])) as LandmarksGeometry
  }
  return landmarksGeometryIsValid(next, dimensions) ? next : null
}

function landmarksFromKeyboard(
  geometry: LandmarksGeometry,
  target: LandmarksAdjustmentTarget,
  event: { key: string; shiftKey: boolean; altKey: boolean },
  dimensions: ImageDimensions,
  mirrored: boolean,
): LandmarksGeometry | null {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    || !landmarksGeometryIsValid(geometry, dimensions)) return null

  const step = event.shiftKey ? 10 : 1
  const delta = {
    x: (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0) * (mirrored ? -1 : 1),
    y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
  }
  const drag = beginLandmarksDrag(geometry, target, { x: 0, y: 0 })
  if (!drag) return null
  if (target === "body") return landmarksFromDrag(drag, delta, dimensions)
  const current = geometry[target]
  return landmarksFromDrag(drag, { x: current.x + delta.x, y: current.y + delta.y }, dimensions)
}

function isLandmarksDrag(drag: { kind: string }): drag is LandmarksDrag {
  return drag.kind === "move-landmarks" || drag.kind === "resize-landmarks"
}

export {
  hitTestLandmarks, beginLandmarksDrag, landmarksFromDrag, landmarksFromKeyboard, isLandmarksDrag,
}
export type { LandmarksAdjustmentTarget, LandmarksHit, LandmarksDrag }
