import type { ImagePoint } from "../types/case-workspace"
import type { TploEditor } from "./tplo-editor"
import { imagePointToPixels, type ImageDimensions } from "./image-point-space"

type TploPlacement = { step: "center" } | { step: "edge"; center: ImagePoint }

const dimensionsValid = ({ widthPx, heightPx }: ImageDimensions) => Number.isFinite(widthPx) && widthPx > 0
  && Number.isFinite(heightPx) && heightPx > 0
const pointValid = (point: ImagePoint, { widthPx, heightPx }: ImageDimensions) => Number.isFinite(point.x) && Number.isFinite(point.y)
  && point.x >= 0 && point.x <= widthPx && point.y >= 0 && point.y <= heightPx

function tploEditorPlacement(editor: TploEditor | null): TploPlacement | null {
  if (editor?.kind !== "tplo-create") return null
  return !editor.center ? { step: "center" } : !editor.edge ? { step: "edge", center: editor.center } : null
}

function tploPlacementInPixels(placement: TploPlacement | undefined, dimensions: ImageDimensions): TploPlacement | null {
  if (!placement || !dimensionsValid(dimensions)) return null
  if (placement.step === "center") return { step: "center" }
  const center = imagePointToPixels(placement.center, dimensions)
  return pointValid(center, dimensions) ? { step: "edge", center } : null
}

// A suggested cursor is presentation only. It never creates a cut or picks a
// clinical blade size: every point still requires an explicit confirmation.
function tploPlacementCursor(placement: TploPlacement, dimensions: ImageDimensions): ImagePoint | null {
  if (!dimensionsValid(dimensions)) return null
  const { widthPx, heightPx } = dimensions
  if (placement.step === "center") return { x: widthPx / 2, y: heightPx / 2 }
  const center = placement.center
  if (!pointValid(center, dimensions)) return null
  const options = [{ x: 1, y: 0, room: widthPx - center.x }, { x: -1, y: 0, room: center.x },
    { x: 0, y: 1, room: heightPx - center.y }, { x: 0, y: -1, room: center.y }]
  const direction = options.reduce((best, next) => next.room > best.room ? next : best)
  const length = Math.min(widthPx, heightPx, direction.room) * 0.15
  const point = { x: center.x + direction.x * length, y: center.y + direction.y * length }
  return pointValid(point, dimensions) && (point.x !== center.x || point.y !== center.y) ? point : null
}

function tploPlacementFromKeyboard(placement: TploPlacement, cursor: ImagePoint | null,
  event: { key: string; shiftKey: boolean }, dimensions: ImageDimensions, mirrored: boolean): ImagePoint | null {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) || !dimensionsValid(dimensions)) return null
  const origin = cursor ?? tploPlacementCursor(placement, dimensions)
  if (!origin || !pointValid(origin, dimensions)) return null
  const step = event.shiftKey ? 10 : 1, horizontal = mirrored ? -step : step
  const dx = event.key === "ArrowLeft" ? -horizontal : event.key === "ArrowRight" ? horizontal : 0
  const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0
  return { x: Math.max(0, Math.min(dimensions.widthPx, origin.x + dx)), y: Math.max(0, Math.min(dimensions.heightPx, origin.y + dy)) }
}

export { tploEditorPlacement, tploPlacementInPixels, tploPlacementCursor, tploPlacementFromKeyboard }
export type { TploPlacement }
