import type { z } from "zod"

import { SaveDistanceSchema, type SaveDistanceInput } from "../schemas/image-plan-command.schema"
import type { PlanPointSchema, ImagePlan } from "../schemas/image-plan.schema"
import { nextPlanObjectLabel } from "./plan-object-label"

type DistanceGeometry = { start: z.infer<typeof PlanPointSchema>; end: z.infer<typeof PlanPointSchema> }
// referenceId belongs to the draft. The save command carries only the new line.
type DistanceEditor =
  | { kind: "distance-create"; baseRevision: number; id: string; label: string | null; geometry: DistanceGeometry | null;
      referenceId?: string; untouched?: boolean }
  | { kind: "distance-update"; baseRevision: number; id: string; geometry: DistanceGeometry }
  | { kind: "distance-delete"; baseRevision: number; id: string }

function centeredDistanceGeometry(): DistanceGeometry {
  return { start: { x: 0.5, y: 0.3 }, end: { x: 0.5, y: 0.7 } }
}

function nextDistanceLabel(objects: ImagePlan["document"]["objects"], name: (index: number) => string): string | null {
  return nextPlanObjectLabel(objects, "LINE", name)
}

function distanceLine(plan: ImagePlan, id: string) {
  const matches = plan.document.objects.filter(object => object.id.toLowerCase() === id.toLowerCase())
  return matches.length === 1 && matches[0].type === "LINE" && matches[0].visible !== false ? matches[0] : null
}

function distanceEditorFromCommand(command: SaveDistanceInput): DistanceEditor {
  if (command.kind === "distance-delete") return { ...command }
  const geometry = { start: { ...command.start }, end: { ...command.end } }
  return command.kind === "distance-create"
    ? { kind: command.kind, baseRevision: command.baseRevision, id: command.id, label: command.label, geometry }
    : { kind: command.kind, baseRevision: command.baseRevision, id: command.id, geometry }
}

function distanceCommandFromEditor(editor: DistanceEditor): SaveDistanceInput | null {
  const common = { kind: editor.kind, baseRevision: editor.baseRevision, id: editor.id }
  const parsed = SaveDistanceSchema.safeParse(editor.kind === "distance-delete" ? common
    : { ...common, ...editor.geometry, ...(editor.kind === "distance-create" ? { label: editor.label } : {}) })
  return parsed.success ? parsed.data : null
}

function distanceEditorHasChanges(editor: DistanceEditor, plan?: ImagePlan): boolean {
  if (editor.kind === "distance-create" && editor.untouched) return false
  if (!plan || editor.baseRevision !== plan.revision || editor.kind !== "distance-update") return true
  const line = distanceLine(plan, editor.id)
  return !line || !sameDistanceGeometry(editor.geometry, line)
}

function sameDistanceGeometry(a: DistanceGeometry, b: DistanceGeometry): boolean {
  return Math.abs(a.start.x - b.start.x) < 1e-12 && Math.abs(a.start.y - b.start.y) < 1e-12
    && Math.abs(a.end.x - b.end.x) < 1e-12 && Math.abs(a.end.y - b.end.y) < 1e-12
}

function distanceEditorMatchesCommand(editor: DistanceEditor, command: SaveDistanceInput): boolean {
  const input = distanceCommandFromEditor(editor), expected = SaveDistanceSchema.safeParse(command)
  return Boolean(input && expected.success && JSON.stringify(input) === JSON.stringify(expected.data))
}

export { centeredDistanceGeometry, nextDistanceLabel, distanceLine, distanceEditorFromCommand, distanceCommandFromEditor, distanceEditorHasChanges, distanceEditorMatchesCommand, sameDistanceGeometry }
export type { DistanceEditor, DistanceGeometry }
