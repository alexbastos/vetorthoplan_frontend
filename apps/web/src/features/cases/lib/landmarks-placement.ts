import { PlanPointSchema, TploLandmarksInputSchema } from "../schemas/image-plan.schema"
import type { ImagePoint } from "../types/case-workspace"
import { LANDMARK_POINT_NAMES, type LandmarksPlacement, type LandmarksPointName } from "./landmarks-editor"
import { imagePointToPixels, type ImageDimensions } from "./image-point-space"

type LandmarksPlacementState = Readonly<{
  landmarks: LandmarksPlacement
  activePoint: LandmarksPointName
}>

function dimensionsAreValid({ widthPx, heightPx }: ImageDimensions): boolean {
  return Number.isFinite(widthPx) && widthPx > 0 && Number.isFinite(heightPx) && heightPx > 0
}

function isLandmarksPointName(value: unknown): value is LandmarksPointName {
  return typeof value === "string" && (LANDMARK_POINT_NAMES as readonly string[]).includes(value)
}

function isFinitePoint(value: unknown): value is ImagePoint {
  if (!value || typeof value !== "object") return false
  const point = value as { x?: unknown; y?: unknown }
  return typeof point.x === "number" && Number.isFinite(point.x)
    && typeof point.y === "number" && Number.isFinite(point.y)
}

function landmarksPlacementInPixels(placement: LandmarksPlacementState | undefined, dimensions: ImageDimensions): LandmarksPlacementState | null {
  if (!placement || !placement.landmarks || !dimensionsAreValid(dimensions) || !isLandmarksPointName(placement.activePoint)) return null

  const method = TploLandmarksInputSchema.shape.method.safeParse(placement.landmarks.method)
  if (!method.success) return null

  const landmarks: LandmarksPlacement = { method: method.data }
  for (const name of LANDMARK_POINT_NAMES) {
    const point = placement.landmarks[name]
    if (point === undefined) continue
    const parsed = PlanPointSchema.safeParse(point)
    if (!parsed.success) return null
    landmarks[name] = imagePointToPixels(parsed.data, dimensions)
  }

  return { landmarks, activePoint: placement.activePoint }
}

function landmarksPlacementFromKeyboard(
  placement: LandmarksPlacementState,
  cursor: ImagePoint | null,
  event: { key: string; shiftKey: boolean },
  dimensions: ImageDimensions,
  mirrored: boolean,
): ImagePoint | null {
  if (!dimensionsAreValid(dimensions) || !isLandmarksPointName(placement.activePoint)) return null
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return null

  const { widthPx, heightPx } = dimensions
  const step = event.shiftKey ? 10 : 1
  const savedPoint = placement.landmarks[placement.activePoint]
  const origin = cursor === null
    ? isFinitePoint(savedPoint) ? savedPoint : { x: widthPx / 2, y: heightPx / 2 }
    : isFinitePoint(cursor) ? cursor : null
  if (!origin) return null

  let dx = 0, dy = 0
  switch (event.key) {
    case "ArrowLeft": dx = mirrored ? step : -step; break
    case "ArrowRight": dx = mirrored ? -step : step; break
    case "ArrowUp": dy = -step; break
    case "ArrowDown": dy = step; break
  }

  return {
    x: Math.max(0, Math.min(widthPx, origin.x + dx)),
    y: Math.max(0, Math.min(heightPx, origin.y + dy)),
  }
}

export { landmarksPlacementInPixels, landmarksPlacementFromKeyboard }
export type { LandmarksPlacementState }
