"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

import { toast } from "@/lib/notifications"
import type { LandmarksEditor } from "../lib/landmarks-editor"
import { isImageDeletionLocked } from "../lib/image-deletion"
import { landmarksMatches, type ImagePlan, type TploLandmarksInput } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import { casesQueryKeys as keys } from "./cases-query-keys"
import type { ImageLandmarksState, LandmarksClearCommand } from "./use-image-landmarks"
import type { useLandmarksSaveActions } from "./use-landmarks-save-actions"

type LandmarksDeletionRequest = {
  baseRevision: number; landmarks: TploLandmarksInput | null; editor: LandmarksEditor | null
  client: ReturnType<typeof useQueryClient>; caseId: string; imageId: string; query: object; generation: number
}

function useLandmarksDeletion(image: CaseImage, landmarks: ImageLandmarksState, actions: ReturnType<typeof useLandmarksSaveActions>, onRemoved: (command: LandmarksClearCommand) => void) {
  const client = useQueryClient(), t = useTranslations("cases.workspace.landmarks")
  const [requested, setRequested] = useState<LandmarksDeletionRequest | null>(null)
  const mounted = useRef(false), busy = useRef(false)
  const draftKey = keys.imageLandmarksDraft(image.caseId, image.id), planKey = keys.imagePlan(image.caseId, image.id)
  const query = client.getQueryCache().find({ queryKey: draftKey, exact: true })
  const generation = landmarks.contextGeneration
  const scope = useRef({ client, caseId: image.caseId, imageId: image.id, query, generation })
  scope.current = { client, caseId: image.caseId, imageId: image.id, query, generation }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const sameIdentity = () => mounted.current && scope.current.client === client && scope.current.caseId === image.caseId
    && scope.current.imageId === image.id && Boolean(query && scope.current.query === query
      && client.getQueryCache().find({ queryKey: draftKey, exact: true }) === query)
  const current = () => sameIdentity() && scope.current.generation === generation
  const scoped = requested?.client === client && requested.caseId === image.caseId && requested.imageId === image.id
    && requested.query === query && requested.generation === generation ? requested : null
  const draft = landmarks.editor?.kind === "landmarks-clear" ? landmarks.editor : null
  const candidate: LandmarksDeletionRequest | null = draft && query ? {
    baseRevision: draft.baseRevision, landmarks: scoped?.baseRevision === draft.baseRevision ? scoped.landmarks : landmarks.plan?.document.tplo_landmarks ?? null,
    editor: null, client, caseId: image.caseId, imageId: image.id, query, generation,
  } : scoped
  const saved = landmarks.receipt.phase === "saved" && landmarks.receipt.edit?.kind === "landmarks-clear"
    && candidate?.baseRevision === landmarks.receipt.edit.baseRevision
  const request = saved ? null : candidate
  const phase = draft ? landmarks.receipt.phase : "idle"
  const pending = landmarks.save.isPending || landmarks.recovery.pending
  const checkOnly = Boolean(draft && ["uncertain", "saving", "checking"].includes(phase))
  const target = landmarks.plan?.document.tplo_landmarks
  const staleEditor = Boolean(request && !draft && JSON.stringify(request.editor) !== JSON.stringify(landmarks.editor))
  const conflict = Boolean(request && (phase === "conflict" || landmarks.plan && landmarks.plan.revision !== request.baseRevision
    || !target || request.landmarks && !landmarksMatches(target, request.landmarks)))
  const canCancel = Boolean(request && !pending && !landmarks.locked && !landmarks.deleting && (!draft || landmarks.recovery.canDiscard || phase === "idle"))
  const canConfirm = Boolean(request && !pending && !landmarks.deleting && !staleEditor && (checkOnly ? landmarks.recovery.canCheck
    : landmarks.planQuery.isError ? landmarks.canRetryRead : !landmarks.planQuery.isFetching && landmarks.plan
      && (conflict || (draft ? landmarks.canSave : landmarks.canClear))))

  function canRequest() {
    return Boolean(query && !request && landmarks.canClear && landmarks.plan?.document.tplo_landmarks)
  }
  function open() {
    if (!current() || busy.current || !canRequest() || !query || !landmarks.plan || isImageDeletionLocked(client, image.caseId, image.id)) return
    const latest = client.getQueryData<ImagePlan>(planKey), target = latest?.document.tplo_landmarks
    if (!latest || latest.imageId.toLowerCase() !== image.id.toLowerCase() || latest.revision !== landmarks.plan.revision || !target
      || !landmarksMatches(target, landmarks.plan.document.tplo_landmarks ?? null)
      || client.getQueryState(planKey)?.status !== "success" || client.getQueryState(planKey)?.fetchStatus === "fetching") return
    setRequested({ baseRevision: latest.revision, landmarks: structuredClone(target),
      editor: landmarks.editor ? structuredClone(landmarks.editor) : null, client, caseId: image.caseId, imageId: image.id, query, generation })
  }
  function close(expectedGeneration = generation) {
    setRequested(null)
    requestAnimationFrame(() => {
      if (!sameIdentity() || scope.current.generation !== expectedGeneration || isImageDeletionLocked(client, image.caseId, image.id)) return
      (document.querySelector<HTMLButtonElement>("[data-landmarks-delete]:not(:disabled)")
        ?? document.querySelector<HTMLButtonElement>("[data-landmarks-tool]:not(:disabled):not([aria-disabled=true])")
        ?? document.querySelector<HTMLElement>("[data-calibration-viewport]"))?.focus({ preventScroll: true })
    })
  }
  function cancel() {
    if (!current() || busy.current || !canCancel) return
    if (draft && !landmarks.discard()) return
    close(generation + (draft ? 1 : 0))
  }
  async function confirm() {
    if (!current() || busy.current || !request || !canConfirm
      || !checkOnly && isImageDeletionLocked(client, image.caseId, image.id)) return
    busy.current = true
    try {
      if (checkOnly) {
        const result = await actions.check()
        if (current() && result?.phase === "saved") setRequested(null)
        return
      }
      if (landmarks.planQuery.isError) { await landmarks.refreshRead(); return }
      const latest = client.getQueryData<ImagePlan>(planKey)
      if (!latest || latest.imageId.toLowerCase() !== image.id.toLowerCase() || client.getQueryState(planKey)?.status !== "success"
        || client.getQueryState(planKey)?.fetchStatus === "fetching") return
      if (!draft && JSON.stringify(client.getQueryData<LandmarksEditor | null>(draftKey) ?? null) !== JSON.stringify(request.editor)) return
      if (latest.revision > request.baseRevision && latest.document.tplo_landmarks == null) {
        if (!landmarks.discard()) return
        setRequested(null)
        onRemoved({ kind: "landmarks-clear", baseRevision: request.baseRevision })
        toast.info(t("recovery.alreadyRemoved"), { description: t("recovery.alreadyRemovedDescription") })
        return
      }
      if (conflict || latest.revision !== request.baseRevision || !request.landmarks || !landmarksMatches(latest.document.tplo_landmarks, request.landmarks)) {
        // A newly observed conflict must be shown before consuming the explicit
        // discard decision, just as in the other measurement dialogs.
        if (conflict && landmarks.discard()) close(generation + (landmarks.editor ? 1 : 0))
        return
      }
      const input = draft ? landmarks.command() : landmarks.confirmClear(request.baseRevision, request.editor, request.landmarks)
      const command: LandmarksClearCommand | null = input?.kind === "landmarks-clear" ? input : null
      if (!command || command.baseRevision !== request.baseRevision) return
      const result = await actions.save(command)
      if (current() && result?.phase === "saved") setRequested(null)
    } catch {
      if (current()) toast.error(t("deleteErrorTitle"), { description: t("deleteErrorDescription") })
    } finally { busy.current = false }
  }

  return { request, committed: Boolean(draft), phase, pending, checkOnly, conflict, staleEditor,
    dirty: Boolean(request && !draft && landmarks.hasChanges), readError: landmarks.planQuery.isError,
    canConfirm, canCancel, canRequest, open, cancel, confirm }
}

export { useLandmarksDeletion }
export type LandmarksDeletionState = ReturnType<typeof useLandmarksDeletion>
