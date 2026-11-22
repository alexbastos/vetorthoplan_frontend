import type { ImagePoint } from "../types/case-workspace"
import type { ImageDimensions } from "./image-point-space"
import type { TploGeometry } from "./tplo-geometry"
import type { TploMatrix } from "./tplo-result"

type TploPreviewReason = "dimensions" | "calibration" | "anisotropy" | "fragment" | "incomplete" | "invalid" | "unverified"
type TploPreview = { measurement: { status: "available"; radiusMm: number; rotationDegrees: number } | { status: "unavailable"; reason: TploPreviewReason };
  simulation: { status: "available"; matrix: TploMatrix; originPointsPx: readonly ImagePoint[]; pointsPx: readonly ImagePoint[] }
    | { status: "unavailable"; reason: TploPreviewReason } }
type ViewerTploSimulation = { id: string; source: "preview" | "official"; matrix: TploMatrix;
  originPointsPx: readonly ImagePoint[]; pointsPx: readonly ImagePoint[] }

const unavailable = (reason: TploPreviewReason) => ({ status: "unavailable" as const, reason })
const finitePoint = (point: ImagePoint) => Number.isFinite(point.x) && Number.isFinite(point.y)
const normalized = (point: ImagePoint) => finitePoint(point) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1

function tploValuesPreview(geometry: TploGeometry | null, rotationDegrees: number, dimensions: ImageDimensions | null,
  calibration: { result?: { mm_per_pixel: number } | null } | null | undefined,
  options: { issue?: "dimensions" | "anisotropy" | null; unverified?: boolean } = {}): TploPreview {
  const fail = (reason: TploPreviewReason): TploPreview => ({ measurement: unavailable(reason), simulation: unavailable(reason) })
  if (options.unverified) return fail("unverified")
  if (!dimensions || ![dimensions.widthPx, dimensions.heightPx].every(n => Number.isFinite(n) && n > 0) || options.issue === "dimensions") return fail("dimensions")
  if (options.issue === "anisotropy") return fail("anisotropy")
  const scale = calibration?.result?.mm_per_pixel
  if (typeof scale !== "number" || !Number.isFinite(scale) || scale <= 0) return fail("calibration")
  if (!geometry || !normalized(geometry.center) || !normalized(geometry.edge)
    || !Number.isFinite(rotationDegrees) || rotationDegrees < -180 || rotationDegrees > 180) return fail("invalid")
  const { widthPx: w, heightPx: h } = dimensions
  const radiusMm = Math.hypot((geometry.edge.x - geometry.center.x) * w, (geometry.edge.y - geometry.center.y) * h) * scale
  if (!Number.isFinite(radiusMm) || radiusMm <= 0) return fail("invalid")
  const measurement = { status: "available" as const, radiusMm, rotationDegrees }
  if (geometry.fragmentClosed === false) return { measurement, simulation: unavailable("incomplete") }
  if (!geometry.fragment || geometry.fragment.length < 3) return { measurement, simulation: unavailable("fragment") }
  if (geometry.fragment.length > 500 || !geometry.fragment.every(normalized)) return { measurement, simulation: unavailable("invalid") }
  const cx = geometry.center.x * w, cy = geometry.center.y * h
  const angle = rotationDegrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle)
  const matrix: TploMatrix = [[c, -s, cx - c * cx + s * cy], [s, c, cy - s * cx - c * cy]]
  if (!matrix.every(row => row.every(Number.isFinite))) return { measurement, simulation: unavailable("invalid") }
  const originPointsPx = geometry.fragment.map(point => ({ x: point.x * w, y: point.y * h }))
  const pointsPx = originPointsPx.map(({ x, y }) => ({ x: matrix[0][0] * x + matrix[0][1] * y + matrix[0][2],
    y: matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] }))
  // Output may leave the matrix. Never clamp or reuse these points as input.
  return { measurement, simulation: pointsPx.every(finitePoint) ? { status: "available", matrix, originPointsPx, pointsPx } : unavailable("invalid") }
}

function tploSvgMatrix(matrix: TploMatrix): string {
  return `matrix(${matrix[0][0]} ${matrix[1][0]} ${matrix[0][1]} ${matrix[1][1]} ${matrix[0][2]} ${matrix[1][2]})`
}

export { tploValuesPreview, tploSvgMatrix }
export type { TploPreview, TploPreviewReason, ViewerTploSimulation }
