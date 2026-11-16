import type { AnglePlacement } from "./angle-editor"
import type { AngleGeometry } from "./angle-geometry"
import { imagePointToPixels, type ImageDimensions } from "./image-point-space"

type PendingAnglePlacement = Exclude<AnglePlacement, { step: "complete" }>
type AnglePlacementStep = PendingAnglePlacement["step"]

function anglePlacementInPixels(placement: AnglePlacement | undefined, dimensions: ImageDimensions): PendingAnglePlacement | null {
  if (!placement || placement.step === "complete") return null
  if (placement.step === "start") return { step: "start" }
  if (placement.step === "vertex") return { step: "vertex", start: imagePointToPixels(placement.start, dimensions) }
  return { step: "end", start: imagePointToPixels(placement.start, dimensions), vertex: imagePointToPixels(placement.vertex, dimensions) }
}

function centeredAngleGeometry(): AngleGeometry {
  return { start: { x: 0.35, y: 0.65 }, vertex: { x: 0.5, y: 0.5 }, end: { x: 0.65, y: 0.65 } }
}

export { anglePlacementInPixels, centeredAngleGeometry }
export type { PendingAnglePlacement, AnglePlacementStep }
