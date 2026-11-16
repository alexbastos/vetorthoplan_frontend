import type { DistanceGeometry } from "./distance-editor"
import { imagePointToPixels, type ImageDimensions } from "./image-point-space"

// Presentation of one persisted LINE. The segment's backend length is also
// its radius/diameter in these views; changing the view never changes scale.
type SegmentMeasure = "length" | "radius" | "diameter"

function isSegmentMeasure(value: unknown): value is SegmentMeasure {
  return value === "length" || value === "radius" || value === "diameter"
}

function segmentMeasureFor(id: string, measures?: Readonly<Record<string, SegmentMeasure>>): SegmentMeasure {
  const value = measures?.[id.toLowerCase()]
  return isSegmentMeasure(value) ? value : "length"
}

function segmentCircleInPixels(segment: DistanceGeometry, measure: SegmentMeasure, dimensions: ImageDimensions) {
  if (measure === "length" || !Number.isFinite(dimensions.widthPx) || !Number.isFinite(dimensions.heightPx)
    || dimensions.widthPx <= 0 || dimensions.heightPx <= 0
    || ![segment.start.x, segment.start.y, segment.end.x, segment.end.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) return null
  const start = imagePointToPixels(segment.start, dimensions), end = imagePointToPixels(segment.end, dimensions)
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  if (!Number.isFinite(length) || length <= 0) return null
  return { center: measure === "radius" ? start : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    radiusPx: measure === "radius" ? length : length / 2 }
}

export { isSegmentMeasure, segmentMeasureFor, segmentCircleInPixels }
export type { SegmentMeasure }
