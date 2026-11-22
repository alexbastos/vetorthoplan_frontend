"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"

import { toast } from "@/lib/notifications"
import type { ImagePlanSaveState } from "../lib/calibration-save-state"
import type { TploEditor } from "../lib/tplo-editor"
import { SaveTploSchema, planCommandMatches, type SaveTploInput } from "../schemas/image-plan-command.schema"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { casesQueryKeys as keys } from "./cases-query-keys"
import type { ImageTploState, TploDeleteCommand } from "./use-image-tplo"

type TploGeometryCommand = Extract<SaveTploInput, { kind: "tplo-create" | "tplo-update" | "tplo-delete" }>
type TploGeometryConfirmation = { command: TploGeometryCommand; revision: number }
const geometryCommand = (value: SaveTploInput | null | undefined): value is TploGeometryCommand => value?.kind === "tplo-create" || value?.kind === "tplo-update" || value?.kind === "tplo-delete"
const same = (left: unknown, right: unknown) => {
  const a = SaveTploSchema.safeParse(left), b = SaveTploSchema.safeParse(right)
  return a.success && b.success && JSON.stringify(a.data) === JSON.stringify(b.data)
}

function useTploGeometrySaveActions(tplo: ImageTploState, identity: { caseId: string; imageId: string }, onSaved: (confirmation: TploGeometryConfirmation) => void) {
  const client = useQueryClient(), t = useTranslations("cases.workspace.tplo")
  const receiptKey = keys.imagePlanSave(identity.caseId, identity.imageId), draftKey = keys.imageTploDraft(identity.caseId, identity.imageId)
  const receiptQuery = client.getQueryCache().find({ queryKey: receiptKey, exact: true })
  const scope = useRef({ client, ...identity, receiptQuery, generation: tplo.contextGeneration })
  if (scope.current.client !== client || scope.current.caseId !== identity.caseId || scope.current.imageId !== identity.imageId || scope.current.receiptQuery !== receiptQuery)
    scope.current = { client, ...identity, receiptQuery, generation: tplo.contextGeneration }
  const owner = scope.current, generation = tplo.contextGeneration
  owner.generation = generation
  const mounted = useRef(false), pending = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  async function submit(checkOnly: boolean, expectedDeletion?: TploDeleteCommand) {
    if (!mounted.current || scope.current !== owner || owner.generation !== generation || pending.current) return
    const parsed = SaveTploSchema.safeParse(checkOnly ? tplo.recovery.command : expectedDeletion ?? tplo.command())
    const command = parsed.success ? parsed.data : null
    if (!geometryCommand(command) || (checkOnly ? !tplo.recovery.canCheck : !expectedDeletion && !tplo.canSave)) return
    const draft = client.getQueryData<TploEditor | null>(draftKey)
    const current = () => mounted.current && scope.current === owner
      && client.getQueryCache().find({ queryKey: receiptKey, exact: true }) === receiptQuery
      && (client.getQueryData<TploEditor | null>(draftKey) == null || client.getQueryData(draftKey) === draft)
      && same(client.getQueryData<ImagePlanSaveState>(receiptKey)?.edit, command)
    pending.current = true
    try {
      const result = await (checkOnly ? tplo.recovery.check() : tplo.submit(expectedDeletion))
      if (!result || !current() || result.code === "CLINICAL_CONTEXT_CHANGED" || !same(result.edit, command)) return
      if (result.phase === "saved") {
        const plan = client.getQueryData<ImagePlan>(keys.imagePlan(identity.caseId, identity.imageId))
        const receipt = client.getQueryData<ImagePlanSaveState>(receiptKey)
        if (receipt?.phase !== "saved" || !plan || plan.revision !== result.currentRevision || !planCommandMatches(plan, command)) return
        onSaved({ command, revision: plan.revision })
        // GET recovery already emits its own notification.
        if (!checkOnly) {
          const key = result.code === "TPLO_ALREADY_REMOVED" ? "alreadyRemoved" : command.kind === "tplo-delete" ? "deleted" : "saved"
          toast[key === "alreadyRemoved" ? "info" : "success"](t(`recovery.${key}`), { description: t(`recovery.${key}Description`) })
        }
      } else if (!checkOnly && result.code !== "OPERATION_BLOCKED") {
        toast.error(t("geometry.saveError"), { description: t(result.phase === "conflict" ? "recovery.conflict" : result.phase === "uncertain" ? "recovery.uncertain"
          : result.code === "CLINICAL_VALIDATION_INVALID" || result.code === "PLAN_SAVE_NOT_ALLOWED" ? "parameters.reviewBlocked" : "geometry.saveErrorDescription") })
      }
      return result
    } catch {
      if (current()) toast.error(t("geometry.saveError"), { description: t("geometry.saveErrorDescription") })
    } finally { pending.current = false }
  }
  return { save: (expectedDeletion?: TploDeleteCommand) => submit(false, expectedDeletion), check: () => submit(true) }
}

export { useTploGeometrySaveActions }
export type { TploGeometryConfirmation }
