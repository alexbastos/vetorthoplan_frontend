"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

import { toast } from "@/lib/notifications"
import { isImageDeletionLocked } from "../lib/image-deletion"
import { tploObject, type TploEditor } from "../lib/tplo-editor"
import { hasUniquePlanObjectIds } from "../schemas/image-plan-command.schema"
import type { ImagePlan } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import { casesQueryKeys as keys } from "./cases-query-keys"
import type { ImageTploState } from "./use-image-tplo"
import type { useTploGeometrySaveActions } from "./use-tplo-geometry-save-actions"

function useTploDeletion(image: CaseImage, tplo: ImageTploState, actions: ReturnType<typeof useTploGeometrySaveActions>,
  onRestore: (id: string, revision: number, removed: boolean) => void) {
  const client = useQueryClient(), t = useTranslations("cases.workspace.tplo")
  const draftKey = keys.imageTploDraft(image.caseId, image.id), planKey = keys.imagePlan(image.caseId, image.id)
  const queries = [draftKey, planKey, keys.imagePlanSave(image.caseId, image.id)]
    .map(queryKey => client.getQueryCache().find({ queryKey, exact: true }))
  const context = { client, caseId: image.caseId, imageId: image.id, generation: tplo.contextGeneration, queries }
  const owner = useRef(context)
  owner.current = context
  const [requested, setRequested] = useState<(typeof context & { id: string; baseRevision: number; editor: TploEditor | null }) | null>(null)
  const [working, setWorking] = useState<"read" | "write" | null>(null)
  const mounted = useRef(false), busy = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const sameIdentity = () => mounted.current && owner.current.client === client && owner.current.caseId === image.caseId && owner.current.imageId === image.id
    && queries.every((query, index) => query && query === owner.current.queries[index]
      && query === client.getQueryCache().find({ queryKey: [draftKey, planKey, keys.imagePlanSave(image.caseId, image.id)][index], exact: true }))
  const current = () => sameIdentity() && owner.current.generation === context.generation && !tplo.deleting
  const scoped = requested && requested.client === client && requested.caseId === image.caseId && requested.imageId === image.id
    && requested.generation === context.generation && queries.every((query, index) => query === requested.queries[index]) ? requested : null
  const draft = tplo.editor?.kind === "tplo-delete" ? tplo.editor : null
  const candidate = draft ? { ...context, id: draft.id, baseRevision: draft.baseRevision, editor: null } : scoped
  const saved = tplo.receipt.phase === "saved" && tplo.receipt.edit?.kind === "tplo-delete"
    && tplo.receipt.edit.id.toLowerCase() === candidate?.id.toLowerCase() && tplo.receipt.edit.baseRevision === candidate?.baseRevision
  const request = saved ? null : candidate
  const phase = working === "read" ? "checking" : draft ? tplo.receipt.phase : "idle"
  const pending = Boolean(working) || tplo.save.isPending || tplo.recovery.pending
  const checkOnly = Boolean(draft && ["saving", "checking", "uncertain"].includes(phase))
  const target = request && tplo.plan ? tploObject(tplo.plan, request.id) : null
  const conflict = Boolean(request && (phase === "conflict" || tplo.plan?.revision !== request.baseRevision || !target || target.locked))
  const staleEditor = Boolean(request && !draft && request.editor !== tplo.editor)
  const canCancel = Boolean(request && !pending && !tplo.deleting && (!draft || phase === "idle" || tplo.recovery.canDiscard))
  const canConfirm = Boolean(request && !pending && !tplo.deleting && !staleEditor && (checkOnly ? tplo.recovery.canCheck
    : tplo.planQuery.isError ? tplo.canRetryRead : !tplo.planQuery.isFetching && tplo.plan && hasUniquePlanObjectIds(tplo.plan.document)
      && (draft ? tplo.recovery.canDiscard || phase === "idle" && tplo.canSave : conflict || tplo.canDelete(request.id))))

  function canRequest(id: string) { return !request && !working && !busy.current && tplo.canDelete(id) }
  function open(id: string) {
    if (!current() || busy.current || !canRequest(id) || !tplo.plan || isImageDeletionLocked(client, image.caseId, image.id)) return
    setRequested({ ...context, id, baseRevision: tplo.plan.revision, editor: client.getQueryData<TploEditor | null>(draftKey) ?? null })
  }
  function focus() {
    requestAnimationFrame(() => {
      if (!sameIdentity()) return
      (document.querySelector<HTMLButtonElement>("[data-tplo-delete]:not(:disabled)")
        ?? document.querySelector<HTMLElement>("[data-calibration-viewport]"))?.focus({ preventScroll: true })
    })
  }
  function cancel() {
    if (!current() || busy.current || !canCancel || !request) return
    if (draft) {
      const revision = client.getQueryData<ImagePlan>(planKey)?.revision
      if (!tplo.discard()) return
      if (revision !== undefined) onRestore(request.id, revision, false)
    }
    setRequested(null); focus()
  }
  async function confirm() {
    // An uncertain plan write deliberately locks mutations. Its GET-only
    // verification must remain available; recovery checks deletion separately.
    if (!current() || busy.current || !request || !canConfirm || !checkOnly && isImageDeletionLocked(client, image.caseId, image.id)) return
    busy.current = true
    setWorking(checkOnly || tplo.planQuery.isError ? "read" : "write")
    try {
      if (checkOnly) { await actions.check(); return }
      if (tplo.planQuery.isError) { await tplo.refreshRead(); return }
      const latest = client.getQueryData<ImagePlan>(planKey)
      if (!latest || latest.imageId.toLowerCase() !== image.id.toLowerCase() || !hasUniquePlanObjectIds(latest.document)
        || client.getQueryState(planKey)?.status !== "success" || client.getQueryState(planKey)?.fetchStatus === "fetching"
        || !draft && (client.getQueryData(draftKey) ?? null) !== request.editor) return
      const absent = !latest.document.objects.some(object => object.id.toLowerCase() === request.id.toLowerCase())
      if (latest.revision > request.baseRevision && absent) {
        if (!tplo.discard()) return
        setRequested(null); onRestore(request.id, latest.revision, true)
        toast.info(t("recovery.alreadyRemoved"), { description: t("recovery.alreadyRemovedDescription") })
        return
      }
      if (conflict || draft && phase === "error") {
        if (!tplo.discard()) return
        setRequested(null); onRestore(request.id, latest.revision, false); return
      }
      if (latest.revision !== request.baseRevision || !tploObject(latest, request.id) || tploObject(latest, request.id)?.locked) return
      const command = draft ? tplo.command() : tplo.confirmDelete(request.id, request.baseRevision, request.editor)
      if (command?.kind === "tplo-delete" && command.id.toLowerCase() === request.id.toLowerCase() && command.baseRevision === request.baseRevision) await actions.save(command)
    } catch {
      if (current()) toast.error(t("deletion.errorTitle"), { description: t("deletion.error") })
    } finally { busy.current = false; if (mounted.current) setWorking(null) }
  }
  return { request, committed: Boolean(draft), phase, pending, checkOnly, conflict, staleEditor,
    dirty: Boolean(request && !draft && tplo.hasChanges), readError: tplo.planQuery.isError,
    canConfirm, canCancel, canRequest, open, cancel, confirm }
}

export { useTploDeletion }
export type TploDeletionState = ReturnType<typeof useTploDeletion>
