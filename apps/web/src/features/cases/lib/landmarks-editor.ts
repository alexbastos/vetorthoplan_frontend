import { SaveLandmarksSchema, type SaveLandmarksInput } from "../schemas/image-plan-command.schema"
import { landmarksMatches, PlanPointSchema, TploLandmarksInputSchema, type ImagePlan, type TploLandmarksInput } from "../schemas/image-plan.schema"
import type { ImagePoint } from "../types/case-workspace"
import type { LandmarksGeometry } from "./landmarks-geometry"

const LANDMARK_POINT_NAMES = ["plateau_cranial", "plateau_caudal", "intercondylar_midpoint", "talus_center"] as const
type LandmarksPointName = typeof LANDMARK_POINT_NAMES[number]
type LandmarksPlacement = Pick<TploLandmarksInput, "method"> & Partial<Omit<TploLandmarksInput, "method">>
type LandmarksEditor =
  | { kind: "landmarks-set"; baseRevision: number; landmarks: LandmarksPlacement; activePoint: LandmarksPointName }
  | { kind: "landmarks-clear"; baseRevision: number }

// Partial placement stays local. Only the complete, strict command can be sent
// or matched to an acknowledgement; neither branch has an object UUID.
function landmarksCommandFromEditor(editor: LandmarksEditor): SaveLandmarksInput | null {
  const parsed = SaveLandmarksSchema.safeParse(editor.kind === "landmarks-clear" ? editor
    : { kind: editor.kind, baseRevision: editor.baseRevision, landmarks: editor.landmarks })
  return parsed.success ? parsed.data : null
}

function landmarksEditorFromCommand(command: SaveLandmarksInput): LandmarksEditor {
  const parsed = SaveLandmarksSchema.parse(command)
  return parsed.kind === "landmarks-clear" ? parsed : { ...parsed, activePoint: LANDMARK_POINT_NAMES[0] }
}

function landmarksEditorFromPlan(plan: ImagePlan): LandmarksEditor {
  const saved = plan.document.tplo_landmarks
  return saved ? landmarksEditorFromCommand({ kind: "landmarks-set", baseRevision: plan.revision, landmarks: saved })
    : { kind: "landmarks-set", baseRevision: plan.revision, activePoint: LANDMARK_POINT_NAMES[0],
      landmarks: { method: TploLandmarksInputSchema.shape.method.parse(undefined) } }
}

function selectLandmarksPoint(editor: LandmarksEditor, point: LandmarksPointName): LandmarksEditor | null {
  return editor.kind === "landmarks-set" && LANDMARK_POINT_NAMES.includes(point) ? { ...editor, activePoint: point } : null
}

function changeLandmarksPoint(editor: LandmarksEditor, name: LandmarksPointName, value: ImagePoint): LandmarksEditor | null {
  const parsed = PlanPointSchema.safeParse(value)
  return editor.kind === "landmarks-set" && LANDMARK_POINT_NAMES.includes(name) && parsed.success
    ? { ...editor, landmarks: { ...editor.landmarks, [name]: parsed.data } } : null
}

function placeLandmarksPoint(editor: LandmarksEditor, name: LandmarksPointName, value: ImagePoint): LandmarksEditor | null {
  if (editor.kind !== "landmarks-set" || editor.activePoint !== name) return null
  const next = changeLandmarksPoint(editor, name, value)
  if (!next || next.kind !== "landmarks-set") return null
  const missing = LANDMARK_POINT_NAMES.find(point => !next.landmarks[point])
  return { ...next, activePoint: missing ?? name }
}

function landmarksGeometryFromEditor(editor: LandmarksEditor): LandmarksGeometry | null {
  if (editor.kind !== "landmarks-set") return null
  const parsed = TploLandmarksInputSchema.safeParse(editor.landmarks)
  if (!parsed.success) return null
  const { plateau_cranial, plateau_caudal, intercondylar_midpoint, talus_center } = parsed.data
  return { plateau_cranial, plateau_caudal, intercondylar_midpoint, talus_center }
}

function changeLandmarksGeometry(editor: LandmarksEditor, geometry: LandmarksGeometry): LandmarksEditor | null {
  if (editor.kind !== "landmarks-set" || !landmarksGeometryFromEditor(editor)) return null
  // Commit the complete set atomically and preserve the method and active point.
  // Coincident pairs remain valid input; availability of TPA is a separate concern.
  const parsed = TploLandmarksInputSchema.safeParse({ method: editor.landmarks.method,
    plateau_cranial: geometry.plateau_cranial, plateau_caudal: geometry.plateau_caudal,
    intercondylar_midpoint: geometry.intercondylar_midpoint, talus_center: geometry.talus_center })
  return parsed.success ? { ...editor, landmarks: parsed.data } : null
}

function landmarksEditorMatchesCommand(editor: LandmarksEditor, command: SaveLandmarksInput): boolean {
  const current = landmarksCommandFromEditor(editor), expected = SaveLandmarksSchema.safeParse(command)
  return Boolean(current && expected.success && current.kind === expected.data.kind
    && current.baseRevision === expected.data.baseRevision
    && (current.kind === "landmarks-clear" || expected.data.kind === "landmarks-set"
      && landmarksMatches(current.landmarks, expected.data.landmarks)))
}

function landmarksEditorHasChanges(editor: LandmarksEditor, plan?: ImagePlan): boolean {
  if (!plan || editor.baseRevision !== plan.revision || editor.kind === "landmarks-clear") return true
  const command = landmarksCommandFromEditor(editor)
  return !command || command.kind !== "landmarks-set" || !landmarksMatches(plan.document.tplo_landmarks, command.landmarks)
}

export { LANDMARK_POINT_NAMES, landmarksCommandFromEditor, landmarksEditorFromCommand, landmarksEditorFromPlan,
  landmarksEditorMatchesCommand, landmarksEditorHasChanges, selectLandmarksPoint, changeLandmarksPoint, placeLandmarksPoint,
  landmarksGeometryFromEditor, changeLandmarksGeometry }
export type { LandmarksEditor, LandmarksPlacement, LandmarksPointName }
