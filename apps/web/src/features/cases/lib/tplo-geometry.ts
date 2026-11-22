import type { ImagePoint } from "../types/case-workspace"
import { imagePointToNormalized, imagePointToPixels, type ImageDimensions } from "./image-point-space"
import type { ImageRect } from "./line-marker-interaction"

// Only the input contour. Transformed simulation points are a separate read model
// and must never be clamped, edited, or fed back through this origin channel.
type TploGeometry = { center: ImagePoint; edge: ImagePoint; fragment: ImagePoint[] | null; fragmentClosed?: boolean }

function tploPointerInPixels(pointer: ImagePoint, rect: ImageRect, dimensions: ImageDimensions): ImagePoint | null {
  if (![pointer.x, pointer.y, rect.left, rect.top, rect.width, rect.height, dimensions.widthPx, dimensions.heightPx].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0 || dimensions.widthPx <= 0 || dimensions.heightPx <= 0) return null
  // Captured drags can leave the image. Keep their displacement unbounded here;
  // the origin geometry applies its own bounds after preserving the grab offset.
  const point = { x: (pointer.x - rect.left) / rect.width * dimensions.widthPx, y: (pointer.y - rect.top) / rect.height * dimensions.heightPx }
  return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null
}

function tploInPixels(geometry: TploGeometry, dimensions: ImageDimensions): TploGeometry {
  return { ...geometry, center: imagePointToPixels(geometry.center, dimensions), edge: imagePointToPixels(geometry.edge, dimensions),
    fragment: geometry.fragment?.map(point => imagePointToPixels(point, dimensions)) ?? null }
}

function tploInNormalized(geometry: TploGeometry, dimensions: ImageDimensions, reference?: TploGeometry): TploGeometry {
  const point = (value: ImagePoint, original?: ImagePoint) => {
    const pixels = original && imagePointToPixels(original, dimensions)
    return pixels && pixels.x === value.x && pixels.y === value.y ? { ...original! } : imagePointToNormalized(value, dimensions)
  }
  return { ...geometry, center: point(geometry.center, reference?.center), edge: point(geometry.edge, reference?.edge),
    fragment: geometry.fragment?.map((value, index) => point(value, reference?.fragment?.[index])) ?? null }
}

function tploRadiusPx(geometry: Pick<TploGeometry, "center" | "edge">): number {
  return Math.hypot(geometry.edge.x - geometry.center.x, geometry.edge.y - geometry.center.y)
}

function tploRadiusMm(geometry: Pick<TploGeometry, "center" | "edge">, mmPerPixel: number): number | null {
  const radius = tploRadiusPx(geometry) * mmPerPixel
  return Number.isFinite(mmPerPixel) && mmPerPixel > 0 && Number.isFinite(radius) && radius > 0 ? radius : null
}

function tploGeometryIsValid(geometry: TploGeometry, dimensions: ImageDimensions): boolean {
  const { widthPx, heightPx } = dimensions
  const points = [geometry.center, geometry.edge, ...(geometry.fragment ?? [])]
  const radius = tploRadiusPx(geometry)
  return Number.isFinite(widthPx) && Number.isFinite(heightPx) && widthPx > 0 && heightPx > 0
    && (geometry.fragment === null || geometry.fragment.length <= 500)
    && points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)
      && point.x >= 0 && point.y >= 0 && point.x <= widthPx && point.y <= heightPx)
    && Number.isFinite(radius) && radius > 0
}

type TploDiameterResult = { status: "available"; geometry: TploGeometry; diameterMm: number }
  | { status: "invalid" | "out-of-bounds" }

function tploWithDiameter(geometry: TploGeometry, diameterMm: number, mmPerPixel: number, dimensions: ImageDimensions): TploDiameterResult {
  if (!tploGeometryIsValid(geometry, dimensions) || !Number.isFinite(diameterMm) || diameterMm <= 0
    || !Number.isFinite(mmPerPixel) || mmPerPixel <= 0) return { status: "invalid" }
  const doubleScale = 2 * mmPerPixel
  const radius = Number.isFinite(doubleScale) ? diameterMm / doubleScale : diameterMm / 2 / mmPerPixel
  const originalRadius = tploRadiusPx(geometry)
  if (!Number.isFinite(radius) || radius <= 0) return { status: "out-of-bounds" }
  const edge = { x: geometry.center.x + (geometry.edge.x - geometry.center.x) / originalRadius * radius,
    y: geometry.center.y + (geometry.edge.y - geometry.center.y) / originalRadius * radius }
  const next = { ...geometry, edge }
  // Reject an impossible direction/size; do not silently shrink the request.
  return tploGeometryIsValid(next, dimensions) ? { status: "available", geometry: next, diameterMm } : { status: "out-of-bounds" }
}

export { tploPointerInPixels, tploInPixels, tploInNormalized, tploRadiusPx, tploRadiusMm, tploGeometryIsValid, tploWithDiameter }
export type { TploGeometry, TploDiameterResult }
