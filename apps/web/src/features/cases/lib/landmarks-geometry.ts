import type { ImagePoint } from "../types/case-workspace"
import type { TploLandmarksInput } from "../schemas/image-plan.schema"
import { LANDMARK_POINT_NAMES } from "./landmarks-editor"
import { imagePointToNormalized, imagePointToPixels, type ImageDimensions } from "./image-point-space"

type LandmarksGeometry = Omit<TploLandmarksInput, "method">

function mapLandmarks(geometry: LandmarksGeometry, map: (point: ImagePoint) => ImagePoint): LandmarksGeometry {
  return {
    plateau_cranial: map(geometry.plateau_cranial),
    plateau_caudal: map(geometry.plateau_caudal),
    intercondylar_midpoint: map(geometry.intercondylar_midpoint),
    talus_center: map(geometry.talus_center),
  }
}

function landmarksInPixels(geometry: LandmarksGeometry, dimensions: ImageDimensions): LandmarksGeometry {
  return mapLandmarks(geometry, point => imagePointToPixels(point, dimensions))
}

function landmarksInNormalized(geometry: LandmarksGeometry, dimensions: ImageDimensions, reference?: LandmarksGeometry): LandmarksGeometry {
  const result = mapLandmarks(geometry, point => imagePointToNormalized(point, dimensions))
  if (reference) {
    const original = landmarksInPixels(reference, dimensions)
    // Keep every untouched coordinate exact, including the fixed axis of a nudge.
    for (const key of LANDMARK_POINT_NAMES) {
      if (geometry[key].x === original[key].x) result[key].x = reference[key].x
      if (geometry[key].y === original[key].y) result[key].y = reference[key].y
    }
  }
  return result
}

function landmarksGeometryIsValid(geometry: LandmarksGeometry, { widthPx, heightPx }: ImageDimensions): boolean {
  return Number.isFinite(widthPx) && Number.isFinite(heightPx) && widthPx > 0 && heightPx > 0
    && LANDMARK_POINT_NAMES.every(key => Number.isFinite(geometry[key].x) && Number.isFinite(geometry[key].y)
      && geometry[key].x >= 0 && geometry[key].x <= widthPx && geometry[key].y >= 0 && geometry[key].y <= heightPx)
}

export { landmarksInPixels, landmarksInNormalized, landmarksGeometryIsValid }
export type { LandmarksGeometry }
