import type { ImagePoint } from "../types/case-workspace"

type ImageDimensions = Readonly<{ widthPx: number; heightPx: number }>

// Geometry uses the original matrix, never the rounded preview dimensions.
// Do not round or clamp here: callers validate their own domain boundaries.
function imagePointToPixels(point: ImagePoint, { widthPx, heightPx }: ImageDimensions): ImagePoint {
  return { x: point.x * widthPx, y: point.y * heightPx }
}

function imagePointToNormalized(point: ImagePoint, { widthPx, heightPx }: ImageDimensions): ImagePoint {
  return { x: point.x / widthPx, y: point.y / heightPx }
}

export { imagePointToPixels, imagePointToNormalized }
export type { ImageDimensions }
