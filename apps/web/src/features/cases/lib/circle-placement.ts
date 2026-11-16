import type { CirclePlacement } from "./circle-editor"
import type { CircleGeometry } from "./circle-geometry"
import { imagePointToPixels, type ImageDimensions } from "./image-point-space"

type PendingCirclePlacement = Exclude<CirclePlacement, { step: "complete" }>

function circlePlacementInPixels(placement: CirclePlacement | undefined, dimensions: ImageDimensions): PendingCirclePlacement | null {
  if (!placement || placement.step === "complete") return null
  return placement.step === "center" ? { step: "center" } : { step: "edge", center: imagePointToPixels(placement.center, dimensions) }
}

function centeredCircleGeometry({ widthPx, heightPx }: ImageDimensions): CircleGeometry | null {
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0) return null
  const radius = Math.min(widthPx, heightPx) * 0.15
  return { center: { x: 0.5, y: 0.5 }, edge: { x: 0.5 + radius / widthPx, y: 0.5 } }
}

export { circlePlacementInPixels, centeredCircleGeometry }
export type { PendingCirclePlacement }
