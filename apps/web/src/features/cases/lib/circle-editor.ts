import { SaveCircleSchema, type SaveCircleInput } from "../schemas/image-plan-command.schema"
import { PlanPointSchema, type ImagePlan } from "../schemas/image-plan.schema"
import type { ImagePoint } from "../types/case-workspace"
import type { CircleGeometry } from "./circle-geometry"
import { nextPlanObjectLabel } from "./plan-object-label"

type CirclePlacement =
  | { step: "center" }
  | { step: "edge"; center: ImagePoint }
  | { step: "complete"; geometry: CircleGeometry }
type CirclePlacementStep = Exclude<CirclePlacement, { step: "complete" }>["step"]

type CircleEditor =
  | { kind: "circle-create"; baseRevision: number; id: string; label: string | null; placement: CirclePlacement }
  | { kind: "circle-update"; baseRevision: number; id: string; geometry: CircleGeometry }
  | { kind: "circle-delete"; baseRevision: number; id: string }

function circleObject(plan: ImagePlan, id: string) {
  const matches = plan.document.objects.filter(object => object.id.toLowerCase() === id.toLowerCase())
  return matches.length === 1 && matches[0].type === "CIRCLE" && matches[0].visible !== false ? matches[0] : null
}

function nextCircleLabel(objects: ImagePlan["document"]["objects"], name: (index: number) => string) {
  return nextPlanObjectLabel(objects, "CIRCLE", name)
}

function circleEditorGeometry(editor: CircleEditor): CircleGeometry | null {
  if (editor.kind === "circle-delete") return null
  if (editor.kind === "circle-update") return editor.geometry
  return editor.placement.step === "complete" ? editor.placement.geometry : null
}

function circleEditorFromCommand(command: SaveCircleInput): CircleEditor {
  if (command.kind === "circle-delete") return { ...command }
  const geometry = { center: { ...command.center }, edge: { ...command.edge } }
  return command.kind === "circle-create"
    ? { kind: command.kind, baseRevision: command.baseRevision, id: command.id, label: command.label, placement: { step: "complete", geometry } }
    : { kind: command.kind, baseRevision: command.baseRevision, id: command.id, geometry }
}

function circleCommandFromEditor(editor: CircleEditor): SaveCircleInput | null {
  const common = { kind: editor.kind, baseRevision: editor.baseRevision, id: editor.id }
  let input: unknown = common
  if (editor.kind === "circle-update") input = { ...common, ...editor.geometry }
  if (editor.kind === "circle-create") {
    if (editor.placement.step !== "complete") return null
    input = { ...common, ...editor.placement.geometry, label: editor.label }
  }
  const parsed = SaveCircleSchema.safeParse(input)
  return parsed.success ? parsed.data : null
}

function circleEditorHasChanges(editor: CircleEditor, plan?: ImagePlan): boolean {
  if (!plan || editor.baseRevision !== plan.revision || editor.kind !== "circle-update") return true
  const saved = circleObject(plan, editor.id)
  return !saved || (["center", "edge"] as const).some(point =>
    editor.geometry[point].x !== saved[point].x || editor.geometry[point].y !== saved[point].y)
}

function circleEditorMatchesCommand(editor: CircleEditor, command: SaveCircleInput): boolean {
  const input = circleCommandFromEditor(editor)
  const expected = SaveCircleSchema.safeParse(command)
  return Boolean(input && expected.success && JSON.stringify(input) === JSON.stringify(expected.data))
}

function changeCircleGeometry(editor: CircleEditor, geometry: CircleGeometry): CircleEditor | null {
  if (editor.kind === "circle-delete") return null
  const candidate: CircleEditor = editor.kind === "circle-create"
    ? { ...editor, placement: { step: "complete", geometry } } : { ...editor, geometry }
  // Validate and copy both points before caching a complete geometry.
  const command = circleCommandFromEditor(candidate)
  return command ? circleEditorFromCommand(command) : null
}

function placeCirclePoint(editor: CircleEditor, value: ImagePoint): CircleEditor | null {
  const parsed = PlanPointSchema.safeParse(value)
  if (editor.kind !== "circle-create" || !parsed.success) return null
  const placement = editor.placement
  if (placement.step === "center") return { ...editor, placement: { step: "edge", center: parsed.data } }
  if (placement.step === "edge") return changeCircleGeometry(editor, { center: placement.center, edge: parsed.data })
  return null
}

export { circleObject, nextCircleLabel, circleEditorGeometry, circleEditorFromCommand, circleCommandFromEditor,
  circleEditorHasChanges, circleEditorMatchesCommand, changeCircleGeometry, placeCirclePoint }
export type { CircleEditor, CirclePlacement, CirclePlacementStep }
