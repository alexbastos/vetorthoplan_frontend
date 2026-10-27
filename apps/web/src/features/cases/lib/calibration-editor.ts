import { CalibrationInputSchema, calibrationInputOf, type CalibrationInput, type ImagePlan } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import type { CalibrationMarker, ImagePoint } from "../types/case-workspace"
import { circleDiameter, circleFromDiameter } from "./circle-marker-interaction"

type Dimensions = { widthPx: number; heightPx: number }
type Geometry = Omit<Extract<CalibrationInput, { kind: "REFERENCE_LINE" }>, "known_length_mm">
  | Omit<Extract<CalibrationInput, { kind: "REFERENCE_CIRCLE" }>, "known_diameter_mm">
type CalibrationEditor = { baseRevision: number; kind: CalibrationMarker["kind"]; geometry: Geometry | null; reference: string; unit: "cm" | "mm" }

function calibrationGeometryIssue(image: CaseImage): "dimensions" | "anisotropy" | null {
  if (!image.widthPx || !image.heightPx) return "dimensions"
  return image.kind === "DICOM" && [image.pixelSpacingMm, image.imagerPixelSpacingMm].some(spacing =>
    spacing && Math.abs(spacing[0] / spacing[1] - 1) > 1e-6) ? "anisotropy" : null
}

function editorFromCalibration(baseRevision: number, calibration: CalibrationInput | null): CalibrationEditor {
  return { baseRevision, kind: calibration?.kind === "REFERENCE_CIRCLE" ? "circle" : "line", geometry: calibration,
    reference: calibration ? String(calibration.kind === "REFERENCE_LINE" ? calibration.known_length_mm : calibration.known_diameter_mm) : "", unit: "mm" }
}

function editorFromPlan(plan: ImagePlan): CalibrationEditor {
  return editorFromCalibration(plan.revision, calibrationInputOf(plan.document.calibration))
}

function referenceInMillimetres(reference: string, unit: CalibrationEditor["unit"]): number | null {
  const text = reference.trim().replace(",", ".")
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null
  const value = shiftDecimal(text, unit === "cm" ? 1 : 0)
  return Number.isFinite(value) && value > 0 && value <= 10000 ? value : null
}

// Shift the decimal before converting to binary floating point: 0.07 cm must
// reopen as exactly the same JS number as 0.7 mm, without an extra rounding step.
function shiftDecimal(text: string, places: number): number {
  const [coefficient, exponent = "0"] = text.split(/[eE]/)
  return Number(`${coefficient}e${Number(exponent) + places}`)
}

function convertReferenceUnit(reference: string, from: CalibrationEditor["unit"], to: CalibrationEditor["unit"]): string {
  const text = reference.trim().replace(",", ".")
  if (from === to || !/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return reference
  const value = shiftDecimal(text, from === "cm" ? 1 : -1)
  return Number.isFinite(value) ? String(value) : reference
}

function calibrationFromEditor(editor: CalibrationEditor): CalibrationInput | null {
  const mm = referenceInMillimetres(editor.reference, editor.unit), geometry = editor.geometry
  if (!geometry || mm === null || (geometry.kind === "REFERENCE_LINE" ? "line" : "circle") !== editor.kind) return null
  // Project geometry explicitly: stored backend results never enter a write.
  const result = CalibrationInputSchema.safeParse(geometry.kind === "REFERENCE_LINE"
    ? { kind: geometry.kind, start: geometry.start, end: geometry.end, known_length_mm: mm }
    : { kind: geometry.kind, center: geometry.center, edge: geometry.edge, known_diameter_mm: mm })
  return result.success ? result.data : null
}

function editorHasChanges(editor: CalibrationEditor, plan: ImagePlan): boolean {
  const saved = calibrationInputOf(plan.document.calibration)
  if (!saved && !editor.geometry && !editor.reference.trim() && editor.kind === "line") return false
  return editor.baseRevision !== plan.revision || JSON.stringify(calibrationFromEditor(editor)) !== JSON.stringify(saved)
    || saved === null && Boolean(editor.geometry || editor.reference.trim() || editor.kind !== "line")
}

function geometryToMarker(geometry: Geometry | null, { widthPx: w, heightPx: h }: Dimensions): CalibrationMarker | null {
  if (!geometry) return null
  const pixel = (point: ImagePoint) => ({ x: point.x * w, y: point.y * h })
  return geometry.kind === "REFERENCE_LINE" ? { kind: "line", start: pixel(geometry.start), end: pixel(geometry.end) }
    : { kind: "circle", center: pixel(geometry.center), edge: pixel(geometry.edge),
      radiusPx: Math.hypot((geometry.edge.x - geometry.center.x) * w, (geometry.edge.y - geometry.center.y) * h) }
}

function markerToGeometry(marker: CalibrationMarker, { widthPx: w, heightPx: h }: Dimensions, previous: Geometry | null = null): Geometry {
  const normal = (point: ImagePoint) => ({ x: point.x / w, y: point.y / h })
  if (marker.kind === "line") return { kind: "REFERENCE_LINE", start: normal(marker.start), end: normal(marker.end) }
  if (marker.edge) return { kind: "REFERENCE_CIRCLE", center: normal(marker.center), edge: normal(marker.edge) }
  const center = marker.center
  // Keep the original center/edge direction when adjusting a saved circle.
  const direction = previous?.kind === "REFERENCE_CIRCLE"
    ? { x: (previous.edge.x - previous.center.x) * w, y: (previous.edge.y - previous.center.y) * h } : { x: 1, y: 0 }
  const length = Math.hypot(direction.x, direction.y) || 1
  const edge = [direction, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
    .map((vector, index) => ({ x: center.x + vector.x / (index === 0 ? length : 1) * marker.radiusPx,
      y: center.y + vector.y / (index === 0 ? length : 1) * marker.radiusPx }))
    .find(point => point.x >= 0 && point.y >= 0 && point.x <= w && point.y <= h)
  return { kind: "REFERENCE_CIRCLE", center: normal(center), edge: normal(edge ?? center) }
}

function defaultReferenceMarker(kind: CalibrationMarker["kind"], { widthPx: w, heightPx: h }: Dimensions): CalibrationMarker {
  return kind === "line" ? { kind, start: { x: w * 0.4, y: h * 0.5 }, end: { x: w * 0.6, y: h * 0.5 } }
    : { kind, center: { x: w * 0.5, y: h * 0.5 }, radiusPx: Math.min(w, h) * 0.1 }
}

function changeEditorMarkerKind(editor: CalibrationEditor, kind: CalibrationMarker["kind"], dimensions: Dimensions): CalibrationEditor {
  if (editor.kind === kind) return editor
  const marker = geometryToMarker(editor.geometry, dimensions)
  let geometry: Geometry | null = null
  if (marker?.kind === "line") geometry = markerToGeometry(circleFromDiameter(marker.start, marker.end), dimensions)
  else if (marker?.kind === "circle") {
    const diameter = circleDiameter(marker)
    // A circular reference can legitimately cross the image boundary. A line
    // needs both endpoints in the original matrix; otherwise placement is needed.
    if ([diameter.start, diameter.end].every(point => point.x >= 0 && point.y >= 0 && point.x <= dimensions.widthPx && point.y <= dimensions.heightPx))
      geometry = markerToGeometry({ kind: "line", ...diameter }, dimensions)
  }
  return { ...editor, kind, geometry }
}

export { calibrationGeometryIssue, editorFromCalibration, editorFromPlan, referenceInMillimetres, convertReferenceUnit, calibrationFromEditor,
  editorHasChanges, geometryToMarker, markerToGeometry, defaultReferenceMarker, changeEditorMarkerKind }
export type { CalibrationEditor, Dimensions, Geometry }
