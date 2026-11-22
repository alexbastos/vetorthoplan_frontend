import type { ImagePoint } from "../types/case-workspace"
import type { TploGeometry } from "./tplo-geometry"

type TploRotationDrag = { kind: "tplo-rotate"; center: ImagePoint; initialDegrees: number; initialBearing: number }
const finite = (point: ImagePoint) => Number.isFinite(point.x) && Number.isFinite(point.y)
const validDegrees = (degrees: number) => Number.isFinite(degrees) && degrees >= -180 && degrees <= 180

function signedDegrees(degrees: number): number {
  const wrapped = degrees % 360
  return wrapped > 180 ? wrapped - 360 : wrapped < -180 ? wrapped + 360 : wrapped
}

function tploRotationHandle(geometry: TploGeometry, degrees: number, scale: number): ImagePoint | null {
  if (!finite(geometry.center) || !finite(geometry.edge) || !validDegrees(degrees) || !Number.isFinite(scale) || scale <= 0) return null
  const dx = geometry.edge.x - geometry.center.x, dy = geometry.edge.y - geometry.center.y, radius = Math.hypot(dx, dy)
  if (!Number.isFinite(radius) || radius <= 0) return null
  const angle = degrees * Math.PI / 180, distance = radius + 24 / scale
  const point = { x: geometry.center.x + (dx / radius * Math.cos(angle) - dy / radius * Math.sin(angle)) * distance,
    y: geometry.center.y + (dx / radius * Math.sin(angle) + dy / radius * Math.cos(angle)) * distance }
  return finite(point) ? point : null
}

function beginTploRotation(center: ImagePoint, degrees: number, point: ImagePoint): TploRotationDrag | null {
  if (!finite(center) || !finite(point) || !validDegrees(degrees) || point.x === center.x && point.y === center.y) return null
  return { kind: "tplo-rotate", center: { ...center }, initialDegrees: degrees,
    initialBearing: Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI }
}

function tploRotationFromPointer(drag: TploRotationDrag, point: ImagePoint): number | null {
  if (!finite(point) || point.x === drag.center.x && point.y === drag.center.y) return null
  const bearing = Math.atan2(point.y - drag.center.y, point.x - drag.center.x) * 180 / Math.PI
  return signedDegrees(drag.initialDegrees + signedDegrees(bearing - drag.initialBearing))
}

function tploRotationFromKeyboard(degrees: number, event: { key: string; shiftKey: boolean }): number | null {
  if (!validDegrees(degrees) || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return null
  const step = event.shiftKey ? 10 : 1
  return Math.max(-180, Math.min(180, degrees + (event.key === "ArrowRight" || event.key === "ArrowUp" ? step : -step)))
}

export { tploRotationHandle, beginTploRotation, tploRotationFromPointer, tploRotationFromKeyboard }
export type { TploRotationDrag }
