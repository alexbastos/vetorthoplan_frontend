import { SaveTploSchema, type SaveTploInput } from "../schemas/image-plan-command.schema"
import { PlanFragmentInputSchema, PlanPointSchema, PlanTploInputSchema, TploParametersInputSchema, type ImagePlan } from "../schemas/image-plan.schema"
import type { ImagePoint } from "../types/case-workspace"
import { nextPlanObjectLabel } from "./plan-object-label"
import { tploCommandFromDraft, type TploDraft } from "./tplo-draft"
import type { TploGeometry } from "./tplo-geometry"

type TploEditor = TploDraft
type TploGeometryEditor = Extract<TploEditor, { kind: "tplo-create" | "tplo-update" }>
type TploCutGeometry = { center: ImagePoint; edge: ImagePoint }
type TploPlacementStep = "center" | "edge"
type TploEditorUi = {
  selectedId: string | null
  activePoint: TploPlacementStep | null
  activeVertex: number | null
  detailsExpanded: boolean
  comparison: "original" | "simulated"
  rotationActive?: boolean
  area?: "body" | "fragment"
}
const DEFAULT_TPLO_EDITOR_UI: TploEditorUi = {
  selectedId: null, activePoint: null, activeVertex: null, detailsExpanded: false, comparison: "original", area: "body",
}

function tploObject(plan: ImagePlan, id: string) {
  const matches = plan.document.objects.filter(object => object.id.toLowerCase() === id.toLowerCase())
  return matches.length === 1 && matches[0].type === "TPLO" && matches[0].visible !== false ? matches[0] : null
}

function nextTploLabel(objects: ImagePlan["document"]["objects"], name: (index: number) => string) {
  return nextPlanObjectLabel(objects, "TPLO", name)
}

function tploEditorFromCommand(command: SaveTploInput): TploEditor {
  const parsed = SaveTploSchema.parse(command)
  return parsed.kind === "tplo-create" || parsed.kind === "tplo-update" ? { ...parsed, fragmentComplete: true } : parsed
}

function tploEditorFromPlan(plan: ImagePlan, id: string): TploEditor | null {
  const object = tploObject(plan, id)
  if (!object) return null
  const command = SaveTploSchema.safeParse({ kind: "tplo-update", id: object.id, baseRevision: plan.revision,
    center: object.center, edge: object.edge, rotation_degrees: object.rotation_degrees, fragment: object.fragment ?? null })
  return command.success ? tploEditorFromCommand(command.data) : null
}

function tploEditorGeometry(editor: TploEditor): TploCutGeometry | null {
  return (editor.kind === "tplo-create" || editor.kind === "tplo-update") && editor.center && editor.edge
    ? { center: editor.center, edge: editor.edge } : null
}

function tploEditorOrigin(editor: TploEditor): TploGeometry | null {
  const cut = tploEditorGeometry(editor)
  return cut && (editor.kind === "tplo-create" || editor.kind === "tplo-update")
    ? { ...cut, fragment: editor.fragment?.points ?? null, fragmentClosed: editor.fragmentComplete !== false } : null
}

function changeTploOrigin(editor: TploEditor, geometry: TploGeometry): TploEditor | null {
  if (editor.kind !== "tplo-create" && editor.kind !== "tplo-update") return null
  if ((geometry.fragment === null) !== (editor.fragment === null) || geometry.fragment?.length !== editor.fragment?.points.length) return null
  const cut = changeTploGeometry(editor, geometry)
  const fragment = geometry.fragment === null ? null : PlanPointSchema.array().max(500).safeParse(geometry.fragment)
  if (!cut || fragment && !fragment.success) return null
  // A gesture moves existing origin points only. Labels, completion and rotation
  // remain untouched; inserting/removing vertices has separate explicit actions.
  return { ...cut, ...(editor.fragment && fragment?.success ? { fragment: { ...editor.fragment, points: fragment.data } } : {}) }
}

function tploPlacementStep(editor: TploEditor): TploPlacementStep | null {
  if (editor.kind !== "tplo-create") return null
  return !editor.center ? "center" : !editor.edge ? "edge" : null
}

function changeTploGeometry(editor: TploEditor, geometry: TploCutGeometry): TploEditor | null {
  if (editor.kind !== "tplo-create" && editor.kind !== "tplo-update") return null
  const center = PlanPointSchema.safeParse(geometry.center), edge = PlanPointSchema.safeParse(geometry.edge)
  if (!center.success || !edge.success || center.data.x === edge.data.x && center.data.y === edge.data.y) return null
  return { ...editor, center: center.data, edge: edge.data }
}

function placeTploPoint(editor: TploEditor, point: ImagePoint, step: TploPlacementStep): TploEditor | null {
  if (editor.kind !== "tplo-create" || tploPlacementStep(editor) !== step) return null
  const parsed = PlanPointSchema.safeParse(point)
  if (!parsed.success) return null
  return step === "center" ? { ...editor, center: parsed.data }
    : editor.center ? changeTploGeometry(editor, { center: editor.center, edge: parsed.data }) : null
}

function changeTploRotation(editor: TploEditor, value: number): TploEditor | null {
  if (editor.kind !== "tplo-create" && editor.kind !== "tplo-update") return null
  const parsed = PlanTploInputSchema.shape.rotation_degrees.safeParse(value)
  return parsed.success ? { ...editor, rotation_degrees: parsed.data } : null
}

function changeTploFragment(editor: TploEditor, value: TploGeometryEditor["fragment"], complete: boolean): TploEditor | null {
  if (editor.kind !== "tplo-create" && editor.kind !== "tplo-update") return null
  if (value === null) return { ...editor, fragment: null, fragmentComplete: true }
  const schema = complete ? PlanFragmentInputSchema : PlanFragmentInputSchema.extend({ points: PlanPointSchema.array().max(500) })
  const parsed = schema.safeParse(value)
  return parsed.success ? { ...editor, fragment: { ...parsed.data, label: parsed.data.label ?? null }, fragmentComplete: complete } : null
}

function changeTploParameters(editor: TploEditor, parameters: Extract<TploEditor, { kind: "tplo-parameters-set" }>["parameters"]): TploEditor | null {
  if (editor.kind !== "tplo-parameters-set") return null
  const parsed = TploParametersInputSchema.partial().safeParse(parameters)
  if (!parsed.success) return null
  // Undefined removes a key from the local patch; explicit null still clears it.
  const patch = { ...parsed.data }
  for (const key of Object.keys(patch) as (keyof typeof patch)[]) if (patch[key] === undefined) delete patch[key]
  return { ...editor, parameters: patch }
}

function tploEditorCommand(editor: TploEditor, plan: ImagePlan): SaveTploInput | null {
  const command = tploCommandFromDraft(editor)
  if (command?.kind === "tplo-parameters-set" && !plan.document.tplo && !command.parameters.laterality) return null
  return command
}

export { DEFAULT_TPLO_EDITOR_UI, tploObject, nextTploLabel, tploEditorFromCommand, tploEditorFromPlan,
  tploEditorGeometry, tploEditorOrigin, changeTploOrigin, tploPlacementStep, placeTploPoint, changeTploGeometry, changeTploRotation, changeTploFragment, changeTploParameters, tploEditorCommand }
export type { TploEditor, TploGeometryEditor, TploCutGeometry, TploPlacementStep, TploEditorUi }
