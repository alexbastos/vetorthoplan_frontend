import { SaveAngleSchema, type SaveAngleInput } from "../schemas/image-plan-command.schema"
import { PlanPointSchema, type ImagePlan } from "../schemas/image-plan.schema"
import type { ImagePoint } from "../types/case-workspace"
import type { AngleGeometry } from "./angle-geometry"
import { nextPlanObjectLabel } from "./plan-object-label"

type AnglePlacement =
  | { step: "start" }
  | { step: "vertex"; start: ImagePoint }
  | { step: "end"; start: ImagePoint; vertex: ImagePoint }
  | { step: "complete"; geometry: AngleGeometry }
type AngleEditor =
  | { kind: "angle-create"; baseRevision: number; id: string; label: string | null; placement: AnglePlacement }
  | { kind: "angle-update"; baseRevision: number; id: string; geometry: AngleGeometry }
  | { kind: "angle-delete"; baseRevision: number; id: string }

function angleObject(plan: ImagePlan, id: string) {
  const matches = plan.document.objects.filter(object => object.id.toLowerCase() === id.toLowerCase())
  return matches.length === 1 && matches[0].type === "ANGLE" && matches[0].visible !== false ? matches[0] : null
}

function nextAngleLabel(objects: ImagePlan["document"]["objects"], name: (index: number) => string) {
  return nextPlanObjectLabel(objects, "ANGLE", name)
}

function angleEditorGeometry(editor: AngleEditor): AngleGeometry | null {
  if (editor.kind === "angle-delete") return null
  if (editor.kind === "angle-update") return editor.geometry
  return editor.placement.step === "complete" ? editor.placement.geometry : null
}

function angleEditorFromCommand(command: SaveAngleInput): AngleEditor {
  if (command.kind === "angle-delete") return { ...command }
  const geometry = { start: { ...command.start }, vertex: { ...command.vertex }, end: { ...command.end } }
  return command.kind === "angle-create"
    ? { kind: command.kind, baseRevision: command.baseRevision, id: command.id, label: command.label, placement: { step: "complete", geometry } }
    : { kind: command.kind, baseRevision: command.baseRevision, id: command.id, geometry }
}

function angleCommandFromEditor(editor: AngleEditor): SaveAngleInput | null {
  const common = { kind: editor.kind, baseRevision: editor.baseRevision, id: editor.id }
  const parsed = SaveAngleSchema.safeParse(editor.kind === "angle-delete" ? common : {
    ...common, ...angleEditorGeometry(editor), ...(editor.kind === "angle-create" ? { label: editor.label } : {}),
  })
  return parsed.success ? parsed.data : null
}

function angleEditorHasChanges(editor: AngleEditor, plan?: ImagePlan): boolean {
  if (!plan || editor.baseRevision !== plan.revision || editor.kind !== "angle-update") return true
  const saved = angleObject(plan, editor.id)
  return !saved || (["start", "vertex", "end"] as const).some(point =>
    editor.geometry[point].x !== saved[point].x || editor.geometry[point].y !== saved[point].y)
}

function angleEditorMatchesCommand(editor: AngleEditor, command: SaveAngleInput): boolean {
  const input = angleCommandFromEditor(editor), expected = SaveAngleSchema.safeParse(command)
  return Boolean(input && expected.success && JSON.stringify(input) === JSON.stringify(expected.data))
}

function changeAngleGeometry(editor: AngleEditor, geometry: AngleGeometry): AngleEditor | null {
  if (editor.kind === "angle-delete") return null
  const candidate: AngleEditor = editor.kind === "angle-create"
    ? { ...editor, placement: { step: "complete", geometry } } : { ...editor, geometry }
  const command = angleCommandFromEditor(candidate)
  // Parse/copy complete geometry before it enters the cache. Zero-degree angles
  // remain valid; a null arm or an out-of-image point is refused.
  return command ? angleEditorFromCommand(command) : null
}

function placeAnglePoint(editor: AngleEditor, value: ImagePoint): AngleEditor | null {
  const parsed = PlanPointSchema.safeParse(value)
  if (editor.kind !== "angle-create" || !parsed.success) return null
  const point = parsed.data, placement = editor.placement
  if (placement.step === "start") return { ...editor, placement: { step: "vertex", start: point } }
  if (placement.step === "vertex") {
    if (placement.start.x === point.x && placement.start.y === point.y) return null
    return { ...editor, placement: { step: "end", start: placement.start, vertex: point } }
  }
  if (placement.step === "end") return changeAngleGeometry(editor, { start: placement.start, vertex: placement.vertex, end: point })
  return null
}

export { angleObject, nextAngleLabel, angleEditorGeometry, angleEditorFromCommand, angleCommandFromEditor,
  angleEditorHasChanges, angleEditorMatchesCommand, changeAngleGeometry, placeAnglePoint }
export type { AngleEditor, AnglePlacement }
