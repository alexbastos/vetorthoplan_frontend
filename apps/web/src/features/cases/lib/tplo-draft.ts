import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { SaveTploSchema, tploCommandMatchesDocument, type SaveTploInput } from "../schemas/image-plan-command.schema"
import type { ImagePlan } from "../schemas/image-plan.schema"
import type { PlanIdentity } from "./calibration-save-state"
import { parseTploParameterFields, type TploParameterFields } from "./tplo-parameters"

type GeometryCommand = Extract<SaveTploInput, { kind: "tplo-create" | "tplo-update" }>
type FragmentDraft = { points: GeometryCommand["center"][]; label?: string | null }
type GeometryDraft<T extends GeometryCommand> = Omit<T, "center" | "edge" | "fragment">
  & Partial<Pick<T, "center" | "edge">>
  & { fragment: FragmentDraft | null; fragmentComplete?: boolean; fragmentBeforeEdit?: FragmentDraft | null }
// Clinical cache only. Selection and presentation live in a separate UI query.
type TploDraft = GeometryDraft<Extract<GeometryCommand, { kind: "tplo-create" }>>
  | GeometryDraft<Extract<GeometryCommand, { kind: "tplo-update" }>>
  | Extract<SaveTploInput, { kind: "tplo-delete" }>
  | (Extract<SaveTploInput, { kind: "tplo-parameters-set" }> & { parameterFields?: TploParameterFields })

function tploCommandFromDraft(draft: TploDraft): SaveTploInput | null {
  if (draft.kind === "tplo-parameters-set" && draft.parameterFields && !parseTploParameterFields(draft.parameterFields).success) return null
  if ((draft.kind === "tplo-create" || draft.kind === "tplo-update") && draft.fragment !== null && draft.fragmentComplete === false) return null
  const common = { kind: draft.kind, baseRevision: draft.baseRevision }
  const value = draft.kind === "tplo-parameters-set" ? { ...common, parameters: draft.parameters }
    : draft.kind === "tplo-delete" ? { ...common, id: draft.id }
      : { ...common, id: draft.id, center: draft.center, edge: draft.edge,
        rotation_degrees: draft.rotation_degrees, fragment: draft.fragment,
        ...(draft.kind === "tplo-create" ? { label: draft.label } : {}) }
  const parsed = SaveTploSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

function tploDraftMatchesCommand(draft: TploDraft, command: SaveTploInput): boolean {
  const input = SaveTploSchema.safeParse(command)
  const current = tploCommandFromDraft(draft)
  return Boolean(current && input.success && JSON.stringify(current) === JSON.stringify(input.data))
}

function tploDraftHasChanges(draft: TploDraft, plan?: ImagePlan): boolean {
  if (draft.kind === "tplo-parameters-set" && draft.parameterFields && !parseTploParameterFields(draft.parameterFields).success) return true
  if (!plan || draft.baseRevision !== plan.revision || draft.kind === "tplo-create" || draft.kind === "tplo-delete") return true
  if (draft.kind === "tplo-parameters-set" && !Object.values(draft.parameters).some(value => value !== undefined)) return false
  const command = tploCommandFromDraft(draft)
  return !command || !tploCommandMatchesDocument(plan.document, command)
}

function hasTploDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return client.getQueryCache().findAll({ queryKey: ["cases", "image-tplo-draft", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const draft = query.state.data as TploDraft | null | undefined
    return Boolean(draft && tploDraftHasChanges(draft, client.getQueryData<ImagePlan>(keys.imagePlan(caseId, String(query.queryKey[3])))))
  })
}

function clearMatchingTploDraft(client: QueryClient, identity: PlanIdentity, command: SaveTploInput, captured: TploDraft | null | undefined) {
  const key = keys.imageTploDraft(identity.caseId, identity.imageId)
  const current = client.getQueryData<TploDraft | null>(key)
  // Even identical geometry in a newer local generation belongs to that editor.
  if (current && current === captured && tploDraftMatchesCommand(current, command)) client.setQueryData(key, null)
}

export { tploCommandFromDraft, tploDraftMatchesCommand, tploDraftHasChanges, hasTploDraft, clearMatchingTploDraft }
export type { TploDraft }
