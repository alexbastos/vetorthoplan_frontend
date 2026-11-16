"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

import { toast } from "@/lib/notifications"
import { circleObject, type CircleEditor } from "../lib/circle-editor"
import { isImageDeletionLocked } from "../lib/image-deletion"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { hasUniquePlanObjectIds } from "../schemas/image-plan-command.schema"
import type { CaseImage } from "../types/case-image"
import { casesQueryKeys as keys } from "./cases-query-keys"
import type { CircleDeleteCommand, ImageCircleState } from "./use-image-circle"
import type { useCircleSaveActions } from "./use-circle-save-actions"

type CircleDeletionRequest = {
  id: string; baseRevision: number; name: string; editor: CircleEditor | null
  client: ReturnType<typeof useQueryClient>; caseId: string; imageId: string; query: object; generation: number
}

function useCircleDeletion(image: CaseImage, circle: ImageCircleState, actions: ReturnType<typeof useCircleSaveActions>, onRemoved: (id: string) => void) {
  const client = useQueryClient(), t = useTranslations("cases.workspace.circle")
  const [requested, setRequested] = useState<CircleDeletionRequest | null>(null)
  const mounted = useRef(false), busy = useRef(false)
  const draftKey = keys.imageCircleDraft(image.caseId, image.id), planKey = keys.imagePlan(image.caseId, image.id)
  const query = client.getQueryCache().find({ queryKey: draftKey, exact: true })
  const generation = circle.contextGeneration
  const scope = useRef({ client, caseId: image.caseId, imageId: image.id, query, generation })
  scope.current = { client, caseId: image.caseId, imageId: image.id, query, generation }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const current = () => mounted.current && scope.current.client === client && scope.current.caseId === image.caseId
    && scope.current.imageId === image.id && scope.current.generation === generation
    && Boolean(query && scope.current.query === query && client.getQueryCache().find({ queryKey: draftKey, exact: true }) === query)
  const scoped = requested?.client === client && requested.caseId === image.caseId && requested.imageId === image.id
    && requested.query === query && requested.generation === generation ? requested : null
  const draft = circle.editor?.kind === "circle-delete" ? circle.editor : null
  const candidate: CircleDeletionRequest | null = draft && query ? {
    id: draft.id, baseRevision: draft.baseRevision, name: circle.plan && circleObject(circle.plan, draft.id)?.label?.trim()
      || (scoped?.id.toLowerCase() === draft.id.toLowerCase() ? scoped.name : null) || t("title"),
    editor: null, client, caseId: image.caseId, imageId: image.id, query, generation,
  } : scoped
  const saved = circle.receipt.phase === "saved" && circle.receipt.edit?.kind === "circle-delete"
    && candidate?.id.toLowerCase() === circle.receipt.edit.id.toLowerCase() && candidate.baseRevision === circle.receipt.edit.baseRevision
  const request = saved ? null : candidate
  const phase = draft ? circle.receipt.phase : "idle"
  const pending = circle.save.isPending || circle.recovery.pending
  const checkOnly = Boolean(draft && ["uncertain", "saving", "checking"].includes(phase))
  const target = request && circle.plan ? circleObject(circle.plan, request.id) : null
  const staleEditor = Boolean(request && !draft && JSON.stringify(request.editor) !== JSON.stringify(circle.editor))
  const conflict = Boolean(request && (phase === "conflict" || circle.plan && circle.plan.revision !== request.baseRevision || !target || target.locked))
  const canCancel = Boolean(request && !pending && !circle.locked && !circle.deleting)
  const canConfirm = Boolean(request && !pending && !circle.deleting && !staleEditor && (checkOnly ? circle.recovery.canCheck
    : circle.planQuery.isError ? circle.canRetryRead : !circle.planQuery.isFetching && circle.plan && hasUniquePlanObjectIds(circle.plan.document) && (conflict || circle.canEdit)))

  function canRequest(id: string) {
    const target = circle.plan && circleObject(circle.plan, id)
    return Boolean(query && !request && target && !target.locked && circle.canEdit
      && (!circle.editor || circle.editor.kind === "circle-update" && circle.editor.id.toLowerCase() === id.toLowerCase()))
  }
  function open(id: string) {
    if (!current() || busy.current || !canRequest(id) || !query || !circle.plan || isImageDeletionLocked(client, image.caseId, image.id)) return
    const latest = client.getQueryData<ImagePlan>(planKey), target = latest && circleObject(latest, id)
    if (!latest || latest.revision !== circle.plan.revision || !hasUniquePlanObjectIds(latest.document) || !target || target.locked
      || client.getQueryState(planKey)?.status !== "success" || client.getQueryState(planKey)?.fetchStatus === "fetching") return
    setRequested({ id: target.id, baseRevision: latest.revision, name: target.label?.trim() || t("title"),
      editor: circle.editor ? structuredClone(circle.editor) : null, client, caseId: image.caseId, imageId: image.id, query, generation })
  }
  function close() {
    setRequested(null)
    requestAnimationFrame(() => {
      if (!current()) return
      (document.querySelector<HTMLButtonElement>(`[data-circle-delete="${request?.id.toLowerCase()}"]:not(:disabled)`)
        ?? document.querySelector<HTMLButtonElement>("[data-circle-tool]:not(:disabled):not([aria-disabled=true])")
        ?? document.querySelector<HTMLElement>("[data-calibration-viewport]"))?.focus({ preventScroll: true })
    })
  }
  function cancel() {
    if (!current() || busy.current || !canCancel) return
    if (draft && !circle.discard()) return
    close()
  }
  async function confirm() {
    if (!current() || busy.current || !request || !canConfirm) return
    busy.current = true
    try {
      if (checkOnly) {
        const result = await actions.check()
        if (current() && result?.phase === "saved") setRequested(null)
        return
      }
      if (circle.planQuery.isError) { await circle.refreshRead(); return }
      const latest = client.getQueryData<ImagePlan>(planKey)
      if (!latest || client.getQueryState(planKey)?.status !== "success" || client.getQueryState(planKey)?.fetchStatus === "fetching"
        || !hasUniquePlanObjectIds(latest.document)) return
      if (!draft && JSON.stringify(client.getQueryData<CircleEditor | null>(draftKey) ?? null) !== JSON.stringify(request.editor)) return
      const absent = !latest.document.objects.some(object => object.id.toLowerCase() === request.id.toLowerCase())
      if (latest.revision > request.baseRevision && absent) {
        if (!circle.discard()) return
        setRequested(null)
        onRemoved(request.id)
        toast.info(t("recovery.alreadyRemoved"), { description: t("recovery.alreadyRemovedDescription") })
        return
      }
      if (conflict || latest.revision !== request.baseRevision) {
        // The updated dialog must expose the discard decision before consuming it.
        if (conflict && circle.discard()) close()
        return
      }
      const input = draft ? circle.command() : circle.confirmDelete(request.id, request.baseRevision, request.editor)
      const command: CircleDeleteCommand | null = input?.kind === "circle-delete" ? input : null
      if (!command || command.id.toLowerCase() !== request.id.toLowerCase() || command.baseRevision !== request.baseRevision) return
      const result = await actions.save(command)
      if (current() && result?.phase === "saved") setRequested(null)
    } catch {
      if (current()) toast.error(t("deleteErrorTitle"), { description: t("deleteErrorDescription") })
    } finally { busy.current = false }
  }

  return { request, committed: Boolean(draft), phase, pending, checkOnly, conflict, staleEditor,
    dirty: Boolean(request && !draft && circle.hasChanges), readError: circle.planQuery.isError,
    canConfirm, canCancel, canRequest, open, cancel, confirm }
}

export { useCircleDeletion }
export type CircleDeletionState = ReturnType<typeof useCircleDeletion>
