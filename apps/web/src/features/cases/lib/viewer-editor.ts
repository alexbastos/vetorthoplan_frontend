import type { CalibrationMarker, ImagePoint } from "../types/case-workspace"
import type { AnglePlacement } from "./angle-editor"
import { anglePlacementInPixels, type AnglePlacementStep } from "./angle-placement"
import type { DistanceGeometry } from "./distance-editor"
import type { DistanceAdjustmentTarget, DistancePickLine } from "./distance-line-interaction"
import type { AngleGeometry } from "./angle-geometry"
import { angleInNormalized, angleInPixels, type AngleAdjustmentTarget, type AnglePickObject } from "./angle-interaction"
import type { CircleGeometry } from "./circle-geometry"
import type { CirclePlacement, CirclePlacementStep } from "./circle-editor"
import { circlePlacementInPixels } from "./circle-placement"
import { circleInNormalized, circleInPixels, type CircleAdjustmentTarget, type CirclePickObject } from "./circle-interaction"
import { landmarksInNormalized, landmarksInPixels, type LandmarksGeometry } from "./landmarks-geometry"
import type { LandmarksAdjustmentTarget } from "./landmarks-interaction"
import { landmarksPlacementInPixels, type LandmarksPlacementState } from "./landmarks-placement"
import type { LandmarksPointName } from "./landmarks-editor"
import { imagePointToNormalized, imagePointToPixels, type ImageDimensions } from "./image-point-space"

type ViewerTool = "mark" | "pan"
type ViewerOverlayView = ImageDimensions & { scale: number; mirrored: boolean; activeGesture?: boolean }
type EditorControls = { editable: boolean; tool: ViewerTool; onToolChange: (tool: ViewerTool) => void }
type DistancePicking = { lines: readonly DistancePickLine[]; selectedId: string | null; enabled: boolean; onSelect: (id: string) => void }
type AnglePicking = { angles: readonly AnglePickObject[]; selectedId: string | null; enabled: boolean; onSelect: (id: string) => void }
type CirclePicking = { circles: readonly CirclePickObject[]; selectedId: string | null; enabled: boolean; onSelect: (id: string) => void }
type ViewerEditor =
  | { kind: "none" }
  | { kind: "distance-select"; picking: DistancePicking }
  | { kind: "angle-select"; picking: AnglePicking }
  | { kind: "circle-select"; picking: CirclePicking }
  | (EditorControls & { kind: "calibration"; marker: CalibrationMarker | null; markerKind: CalibrationMarker["kind"];
      onMarkerChange: (marker: CalibrationMarker) => void })
  | (EditorControls & { kind: "distance"; id: string; geometry: DistanceGeometry | null; intent?: "create" | "update";
      picking?: DistancePicking; keyboardTarget?: DistanceAdjustmentTarget; onKeyboardTargetChange?: (target: DistanceAdjustmentTarget) => void;
      onGeometryPreview?: (geometry: DistanceGeometry | null) => void;
      onPointerActivity?: (active: boolean) => void
      onGeometryChange: (geometry: DistanceGeometry, source: "pointer" | "keyboard") => void })
  | (EditorControls & { kind: "angle"; id: string; baseRevision: number; contextGeneration: number; geometry: AngleGeometry | null;
      placement?: AnglePlacement; onPlacePoint?: (point: ImagePoint, step: AnglePlacementStep) => void; onPlaceCentered?: () => void;
      picking?: AnglePicking;
      keyboardTarget?: AngleAdjustmentTarget; onKeyboardTargetChange?: (target: AngleAdjustmentTarget) => void;
      onGeometryPreview?: (geometry: AngleGeometry | null) => void;
      onGeometryChange: (geometry: AngleGeometry) => void })
  | (EditorControls & { kind: "circle"; id: string; baseRevision: number; contextGeneration: number; geometry: CircleGeometry | null;
      placement?: CirclePlacement; onPlacePoint?: (point: ImagePoint, step: CirclePlacementStep) => void; onPlaceCentered?: () => void;
      picking?: CirclePicking; keyboardTarget?: CircleAdjustmentTarget; onKeyboardTargetChange?: (target: CircleAdjustmentTarget) => void;
      onGeometryPreview?: (geometry: CircleGeometry | null) => void;
      onGeometryChange: (geometry: CircleGeometry) => void })
  | (EditorControls & { kind: "landmarks"; baseRevision: number; contextGeneration: number; geometry: LandmarksGeometry | null;
      placement?: LandmarksPlacementState; onPlacePoint?: (point: ImagePoint, name: LandmarksPointName) => void;
      keyboardTarget?: LandmarksAdjustmentTarget; onKeyboardTargetChange?: (target: LandmarksAdjustmentTarget) => void;
      onGeometryPreview?: (geometry: LandmarksGeometry | null) => void;
      onGeometryChange: (geometry: LandmarksGeometry) => void })

// The viewport operates in pixels; only the active editor adapts domain data.
// A distance never becomes a calibration reference or acquires a known length.
function viewerEditorInPixels(editor: ViewerEditor, dimensions: ImageDimensions) {
  const noMeasurements = { angleGeometry: null, anglePlacement: null, onAngleGeometryChange: (_geometry: AngleGeometry) => {},
    circleGeometry: null, circlePlacement: null, onCircleGeometryChange: (_geometry: CircleGeometry) => {},
    landmarksGeometry: null, landmarksPlacement: null, onLandmarksGeometryChange: (_geometry: LandmarksGeometry) => {} }
  if (editor.kind === "none" || editor.kind === "distance-select" || editor.kind === "angle-select" || editor.kind === "circle-select") return { marker: null, markerKind: "line" as const,
    ...noMeasurements, readOnly: true, tool: "pan" as const, onMarkerChange: (_marker: CalibrationMarker) => {}, onToolChange: (_tool: ViewerTool) => {} }
  if (editor.kind === "calibration") return { ...noMeasurements, ...editor, readOnly: !editor.editable }
  // ANGLE has its own channel. The marker stays null, so neither its vertex
  // nor its geometry can accidentally enter calibration/LINE callbacks.
  if (editor.kind === "angle") return {
    ...noMeasurements,
    marker: null, markerKind: "line" as const, angleGeometry: editor.geometry ? angleInPixels(editor.geometry, dimensions) : null,
    anglePlacement: anglePlacementInPixels(editor.placement, dimensions),
    readOnly: !editor.editable, tool: editor.tool, onToolChange: editor.onToolChange,
    onMarkerChange: (_marker: CalibrationMarker) => {},
    onAngleGeometryChange: (geometry: AngleGeometry) => editor.onGeometryChange(angleInNormalized(geometry, dimensions, editor.geometry ?? undefined)),
  }
  if (editor.kind === "circle") return {
    ...noMeasurements,
    marker: null, markerKind: "line" as const, circleGeometry: editor.geometry ? circleInPixels(editor.geometry, dimensions) : null,
    circlePlacement: circlePlacementInPixels(editor.placement, dimensions),
    readOnly: !editor.editable, tool: editor.tool, onToolChange: editor.onToolChange,
    onMarkerChange: (_marker: CalibrationMarker) => {},
    onCircleGeometryChange: (geometry: CircleGeometry) => editor.onGeometryChange(circleInNormalized(geometry, dimensions, editor.geometry ?? undefined)),
  }
  // The single anatomical set has no object UUID or calibration marker.
  if (editor.kind === "landmarks") return {
    ...noMeasurements,
    marker: null, markerKind: "line" as const, landmarksGeometry: editor.geometry ? landmarksInPixels(editor.geometry, dimensions) : null,
    landmarksPlacement: landmarksPlacementInPixels(editor.placement, dimensions),
    readOnly: !editor.editable, tool: editor.tool, onToolChange: editor.onToolChange,
    onMarkerChange: (_marker: CalibrationMarker) => {},
    onLandmarksGeometryChange: (geometry: LandmarksGeometry) => editor.onGeometryChange(landmarksInNormalized(geometry, dimensions, editor.geometry ?? undefined)),
  }
  return {
    ...noMeasurements,
    marker: editor.geometry ? { kind: "line" as const, start: imagePointToPixels(editor.geometry.start, dimensions), end: imagePointToPixels(editor.geometry.end, dimensions) } : null,
    markerKind: "line" as const, readOnly: !editor.editable, tool: editor.tool, onToolChange: editor.onToolChange,
    onMarkerChange: (marker: CalibrationMarker, source: "pointer" | "keyboard" = "pointer") => {
      if (marker.kind === "line") editor.onGeometryChange({ start: imagePointToNormalized(marker.start, dimensions), end: imagePointToNormalized(marker.end, dimensions) }, source)
    },
  }
}

export { viewerEditorInPixels }
export type { ViewerEditor, ViewerTool, ViewerOverlayView }
