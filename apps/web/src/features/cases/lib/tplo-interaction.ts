import type { ImagePoint } from "../types/case-workspace"
import type { ImageDimensions } from "./image-point-space"
import type { ImageRect } from "./line-marker-interaction"
import { tploGeometryIsValid, tploInPixels, tploRadiusPx, type TploGeometry } from "./tplo-geometry"

type TploAdjustmentTarget = "center" | "edge" | "body" | "fragment" | { vertex: number }
type TploHit = TploAdjustmentTarget | null
type TploPickObject = TploGeometry & { id: string; visible?: boolean; locked?: boolean }
type TploDrag = { kind: "tplo-drag"; geometry: TploGeometry; target: TploAdjustmentTarget; origin: ImagePoint }

function segmentDistance(point: ImagePoint, a: ImagePoint, b: ImagePoint) {
  const dx = b.x - a.x, dy = b.y - a.y, squared = dx * dx + dy * dy
  const t = squared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / squared)) : 0
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy)
}

function containsPoint(point: ImagePoint, polygon: readonly ImagePoint[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function tploHit(pointer: ImagePoint, geometry: TploGeometry, rect: ImageRect, dimensions: ImageDimensions, preferred?: TploAdjustmentTarget) {
  if (![rect.left, rect.top, rect.width, rect.height, pointer.x, pointer.y].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0 || !tploGeometryIsValid(geometry, dimensions)
    || pointer.x < rect.left || pointer.y < rect.top || pointer.x > rect.left + rect.width || pointer.y > rect.top + rect.height) return null
  const sx = rect.width / dimensions.widthPx, sy = rect.height / dimensions.heightPx
  const screen = (point: ImagePoint) => ({ x: rect.left + point.x * sx, y: rect.top + point.y * sy })
  // Honor explicit vertex selection within its screen-space handle. Otherwise a
  // vertex on the cut/pivot could resize or move the cut instead of that point.
  if (typeof preferred === "object" && Number.isInteger(preferred.vertex) && preferred.vertex >= 0) {
    const vertex = geometry.fragment?.[preferred.vertex]
    if (vertex) {
      const point = screen(vertex), distance = Math.hypot(pointer.x - point.x, pointer.y - point.y)
      if (distance <= 12) return { target: { vertex: preferred.vertex }, distance, priority: 0 }
    }
  }
  const center = screen(geometry.center), edge = screen(geometry.edge)
  const centerDistance = Math.hypot(pointer.x - center.x, pointer.y - center.y), edgeDistance = Math.hypot(pointer.x - edge.x, pointer.y - edge.y)
  // Default picking still prioritizes the cut over the fragment interior/contour.
  if (Math.min(centerDistance, edgeDistance) <= 12) {
    const target: TploAdjustmentTarget = centerDistance === edgeDistance && preferred === "edge" || edgeDistance < centerDistance ? "edge" : "center"
    return { target, distance: Math.min(centerDistance, edgeDistance), priority: 0 }
  }
  const radialDistance = Math.abs(Math.hypot((pointer.x - center.x) / sx, (pointer.y - center.y) / sy) - tploRadiusPx(geometry)) * Math.min(sx, sy)
  if (radialDistance <= 8) return { target: "body" as const, distance: radialDistance, priority: 1 }
  const points = geometry.fragment?.map(screen) ?? []
  let nearest = -1, distance = Infinity
  for (let index = 0; index < points.length; index++) {
    const next = Math.hypot(pointer.x - points[index].x, pointer.y - points[index].y)
    if (next <= 12 && (next < distance || next === distance && typeof preferred === "object" && preferred.vertex === index)) {
      nearest = index; distance = next
    }
  }
  if (nearest >= 0) return { target: { vertex: nearest }, distance, priority: 2 }
  const closed = geometry.fragmentClosed !== false
  const segments = points.slice(0, closed ? points.length : Math.max(0, points.length - 1))
  const contourDistance = points.length > 1 ? Math.min(...segments.map((point, index) => segmentDistance(pointer, point, points[(index + 1) % points.length]))) : Infinity
  if (contourDistance <= 8 || closed && points.length >= 3 && containsPoint(pointer, points)) return { target: "fragment" as const, distance: contourDistance, priority: 3 }
  if (Math.hypot((pointer.x - center.x) / sx, (pointer.y - center.y) / sy) < tploRadiusPx(geometry)) return { target: "body" as const, distance: radialDistance, priority: 4 }
  return null
}

function hitTestTplo(pointer: ImagePoint, geometry: TploGeometry, rect: ImageRect, dimensions: ImageDimensions, preferred?: TploAdjustmentTarget): TploHit {
  return tploHit(pointer, geometry, rect, dimensions, preferred)?.target ?? null
}

function pickTplo(pointer: ImagePoint, objects: readonly TploPickObject[], selectedId: string | null, rect: ImageRect, dimensions: ImageDimensions, preferred?: TploAdjustmentTarget) {
  if (new Set(objects.map(object => object.id.toLowerCase())).size !== objects.length) return null
  let best: { id: string; target: TploAdjustmentTarget; distance: number; priority: number } | null = null
  for (const object of objects) {
    if (object.visible === false) continue
    const selected = object.id.toLowerCase() === selectedId?.toLowerCase()
    const hit = tploHit(pointer, tploInPixels(object, dimensions), rect, dimensions, selected ? preferred : undefined)
    if (!hit) continue
    if (selected && hit.priority === 0) return { id: object.id, ...hit }
    const bestSelected = best?.id.toLowerCase() === selectedId?.toLowerCase()
    if (!best || hit.priority < best.priority || hit.priority === best.priority && (hit.distance < best.distance
      || hit.distance === best.distance && (selected && !bestSelected || !bestSelected && object.id.toLowerCase() < best.id.toLowerCase()))) best = { id: object.id, ...hit }
  }
  return best
}

function beginTploDrag(geometry: TploGeometry, target: TploHit, origin: ImagePoint): TploDrag | null {
  return target ? { kind: "tplo-drag", geometry, target, origin } : null
}

function tploFromDrag(drag: TploDrag, point: ImagePoint, dimensions: ImageDimensions): TploGeometry | null {
  if (!tploGeometryIsValid(drag.geometry, dimensions) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
  const { geometry, target } = drag
  const limit = (point: ImagePoint) => ({ x: Math.max(0, Math.min(dimensions.widthPx, point.x)), y: Math.max(0, Math.min(dimensions.heightPx, point.y)) })
  if (target === "edge") {
    // Hit tolerance may start the drag beside the handle. Preserve that offset
    // instead of snapping the edge/vertex to the initial pointer position.
    const next = { ...geometry, edge: limit({ x: geometry.edge.x + (point.x - drag.origin.x), y: geometry.edge.y + (point.y - drag.origin.y) }) }
    return tploGeometryIsValid(next, dimensions) ? next : null
  }
  if (typeof target === "object") {
    if (!Number.isInteger(target.vertex) || target.vertex < 0 || !geometry.fragment || target.vertex >= geometry.fragment.length) return null
    return { ...geometry, fragment: geometry.fragment.map((vertex, index) => index === target.vertex
      ? limit({ x: vertex.x + (point.x - drag.origin.x), y: vertex.y + (point.y - drag.origin.y) }) : vertex) }
  }
  const affected = target === "fragment" ? geometry.fragment ?? [] : target === "center" ? [geometry.center, geometry.edge]
    : [geometry.center, geometry.edge, ...(geometry.fragment ?? [])]
  if (!affected.length) return null
  const dx = Math.max(-Math.min(...affected.map(point => point.x)), Math.min(dimensions.widthPx - Math.max(...affected.map(point => point.x)), point.x - drag.origin.x))
  const dy = Math.max(-Math.min(...affected.map(point => point.y)), Math.min(dimensions.heightPx - Math.max(...affected.map(point => point.y)), point.y - drag.origin.y))
  const translate = (point: ImagePoint) => ({ x: point.x + dx, y: point.y + dy })
  const next = { ...geometry, center: target === "fragment" ? geometry.center : translate(geometry.center),
    edge: target === "fragment" ? geometry.edge : translate(geometry.edge),
    fragment: target === "center" ? geometry.fragment : geometry.fragment?.map(translate) ?? null }
  return tploGeometryIsValid(next, dimensions) ? next : null
}

function tploFromKeyboard(geometry: TploGeometry, target: TploAdjustmentTarget, event: { key: string; shiftKey: boolean }, dimensions: ImageDimensions, mirrored: boolean) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return null
  const step = event.shiftKey ? 10 : 1
  const delta = { x: (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0) * (mirrored ? -1 : 1),
    y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0 }
  const origin = target === "center" ? geometry.center : target === "edge" ? geometry.edge : typeof target === "object" ? geometry.fragment?.[target.vertex] : { x: 0, y: 0 }
  if (!origin) return null
  const drag = beginTploDrag(geometry, target, origin)
  return drag ? tploFromDrag(drag, { x: origin.x + delta.x, y: origin.y + delta.y }, dimensions) : null
}

export { hitTestTplo, pickTplo, beginTploDrag, tploFromDrag, tploFromKeyboard }
export type { TploAdjustmentTarget, TploHit, TploPickObject, TploDrag }
