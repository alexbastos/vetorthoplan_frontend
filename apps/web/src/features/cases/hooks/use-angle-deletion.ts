"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

import { toast } from "@/lib/notifications"
import { angleObject, type AngleEditor } from "../lib/angle-editor"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { hasUniquePlanObjectIds } from "../schemas/image-plan-command.schema"
import type { CaseImage } from "../types/case-image"
import { casesQueryKeys as keys } from "./cases-query-keys"
import type { ImageAngleState } from "./use-image-angle"
import type { useAngleSaveActions } from "./use-angle-save-actions"

type AngleDeletionRequest = {
  id: string; baseRevision: number; name: string; editor: AngleEditor | null
  client: ReturnType<typeof useQueryClient>; caseId: string; imageId: string; query: object
}

function useAngleDeletion(image: CaseImage, angle: ImageAngleState, actions: ReturnType<typeof useAngleSaveActions>, onRemoved: (id: string) => void) {
  const client = useQueryClient(), t = useTranslations("cases.workspace.angle")
  const [requested, setRequested] = useState<AngleDeletionRequest | null>(null)
  const mounted = useRef(false), busy = useRef(false)
  const draftKey = keys.imageAngleDraft(image.caseId, image.id), planKey = keys.imagePlan(image.caseId, image.id)
  const query = client.getQueryCache().find({ queryKey: draftKey, exact: true })
  const scope = useRef({ client, caseId: image.caseId, imageId: image.id, query })
  scope.current = { client, caseId: image.caseId, imageId: image.id, query }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const current = () => mounted.current && scope.current.client === client && scope.current.caseId === image.caseId
    && scope.current.imageId === image.id && Boolean(query && scope.current.query === query && client.getQueryCache().find({ queryKey: draftKey, exact: true }) === query)
  const scoped = requested?.client === client && requested.caseId === image.caseId && requested.imageId === image.id && requested.query === query ? requested : null
  const draft = angle.editor?.kind === "angle-delete" ? angle.editor : null
  const request: AngleDeletionRequest | null = draft && query ? {
    id: draft.id, baseRevision: draft.baseRevision, name: angle.plan && angleObject(angle.plan, draft.id)?.label?.trim()
      || (scoped?.id.toLowerCase() === draft.id.toLowerCase() ? scoped.name : null) || t("title"),
    editor: null, client, caseId: image.caseId, imageId: image.id, query,
  } : scoped
  const phase = draft ? angle.receipt.phase : "idle"
  const pending = angle.save.isPending || angle.recovery.pending
  const checkOnly = Boolean(draft && ["uncertain", "saving", "checking"].includes(phase))
  const target = request && angle.plan ? angleObject(angle.plan, request.id) : null
  const staleEditor = Boolean(request && !draft && JSON.stringify(request.editor) !== JSON.stringify(angle.editor))
  const conflict = Boolean(request && (phase === "conflict" || angle.plan && angle.plan.revision !== request.baseRevision || !target || target.locked))
  const canCancel = Boolean(request && !pending && !angle.locked && !angle.deleting)
  const canConfirm = Boolean(request && !pending && !angle.deleting && !staleEditor && (checkOnly ? angle.recovery.canCheck
    : angle.planQuery.isError ? angle.canRetryRead : !angle.planQuery.isFetching && angle.plan && hasUniquePlanObjectIds(angle.plan.document) && (conflict || angle.canEdit)))

  function canRequest(id: string) {
    const target = angle.plan && angleObject(angle.plan, id)
    return Boolean(query && !request && target && !target.locked && angle.canEdit
      && (!angle.editor || angle.editor.kind === "angle-update" && angle.editor.id.toLowerCase() === id.toLowerCase()))
  }
  function open(id: string) {
    if (!current() || busy.current || !canRequest(id) || !query || !angle.plan) return
    const latest = client.getQueryData<ImagePlan>(planKey), target = latest && angleObject(latest, id)
    if (!latest || latest.revision !== angle.plan.revision || !target || target.locked) return
    setRequested({ id: target.id, baseRevision: latest.revision, name: target.label?.trim() || t("title"), editor: angle.editor,
      client, caseId: image.caseId, imageId: image.id, query })
  }
  function close() {
    setRequested(null)
    requestAnimationFrame(() => {
      if (!current()) return
      (document.querySelector<HTMLButtonElement>(`[data-angle-delete="${request?.id}"]:not(:disabled)`)
        ?? document.querySelector<HTMLButtonElement>("[data-angle-tool]:not(:disabled):not([aria-disabled=true])")
        ?? document.querySelector<HTMLElement>("[data-calibration-viewport]"))?.focus({ preventScroll: true })
    })
  }
  function cancel() {
    if (!current() || busy.current || !canCancel) return
    // Before confirmation there is no delete draft: keep every local point.
    if (draft && !angle.discard()) return
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
      if (angle.planQuery.isError) { await angle.refreshRead(); return }
      const latest = client.getQueryData<ImagePlan>(planKey)
      if (!latest || client.getQueryState(planKey)?.status !== "success" || client.getQueryState(planKey)?.fetchStatus === "fetching"
        || !hasUniquePlanObjectIds(latest.document)) return
      if (!draft && JSON.stringify(client.getQueryData<AngleEditor | null>(draftKey) ?? null) !== JSON.stringify(request.editor)) return
      const absent = !latest.document.objects.some(object => object.id.toLowerCase() === request.id.toLowerCase())
      if (latest.revision > request.baseRevision && absent) {
        if (!angle.discard()) return
        setRequested(null)
        onRemoved(request.id)
        toast.info(t("recovery.alreadyRemoved"), { description: t("recovery.alreadyRemovedDescription") })
        return
      }
      if (conflict || latest.revision !== request.baseRevision) {
        if (angle.discard()) close()
        return
      }
      if (!draft && !angle.confirmDelete(request.id, request.baseRevision, request.editor)) return
      const command = angle.command()
      if (!command || command.kind !== "angle-delete" || command.id.toLowerCase() !== request.id.toLowerCase() || command.baseRevision !== request.baseRevision) return
      const result = await actions.save()
      if (current() && result?.phase === "saved") setRequested(null)
    } catch {
      if (current()) toast.error(t("deleteErrorTitle"), { description: t("deleteErrorDescription") })
    } finally { busy.current = false }
  }

  return { request, committed: Boolean(draft), phase, pending, checkOnly, conflict, staleEditor,
    dirty: Boolean(request && !draft && angle.hasChanges), readError: angle.planQuery.isError,
    canConfirm, canCancel, canRequest, open, cancel, confirm }
}

export { useAngleDeletion }
export type AngleDeletionState = ReturnType<typeof useAngleDeletion>
