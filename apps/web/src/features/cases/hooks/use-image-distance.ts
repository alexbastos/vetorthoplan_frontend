"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { calibrationGeometryIssue } from "../lib/calibration-editor"
import { hasConfirmedImageScale } from "../lib/calibration-product-state"
import { IDLE_CALIBRATION_SAVE, isCalibrationSaveLocked, isPlanImageDeleted, type ImagePlanSaveState } from "../lib/calibration-save-state"
import { isCaseDeletionLocked } from "../lib/case-deletion"
import { centeredDistanceGeometry, nextDistanceLabel, distanceCommandFromEditor, distanceEditorFromCommand, distanceEditorHasChanges, distanceLine,
  sameDistanceGeometry, type DistanceEditor, type DistanceGeometry } from "../lib/distance-editor"
import { IDLE_DELETION, isImageDeletionLocked, type ImageDeletionState } from "../lib/image-deletion"
import { closeOtherCleanMeasurementEditor, hasOtherImagePlanDraft } from "../lib/image-plan-draft"
import { imagePlanQueryOptions } from "../lib/image-plan-query-options"
import { distanceMarkerFromKeyboard, type DistanceAdjustmentTarget, type DistanceArrow } from "../lib/distance-line-interaction"
import { placeDistanceAtReference } from "../lib/distance-placement"
import { imagePointToPixels, imagePointToNormalized } from "../lib/image-point-space"
import { checkImagePlanSave, discardPlanEditSave, requestPlanEditSave } from "../lib/image-plan-saving"
import { hasUniquePlanObjectIds, isDistanceCommand, type SaveDistanceInput } from "../schemas/image-plan-command.schema"
import { PlanLineInputSchema, PlanPointSchema, type ImagePlan } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useOtherImagePlanDraft } from "./use-image-plan-drafts"
import { useWorkspaceDraft } from "./use-workspace-draft"

function useImageDistance(image: CaseImage, ready: boolean, caseLocked: boolean, calibrationEditing = false) {
  const client = useQueryClient()
  const mounted = useRef(false)
  const submitting = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [image.caseId, image.id])
  const identity = { caseId: image.caseId, imageId: image.id }
  const draftKey = keys.imageDistanceDraft(image.caseId, image.id), planKey = keys.imagePlan(image.caseId, image.id)
  const draft = useWorkspaceDraft<DistanceEditor>("image-distance-draft", image.caseId, image.id)
  const [selection, setSelection] = useState<{ imageId: string; id: string } | null>(null)
  const [recoveringSaved, setRecoveringSaved] = useState(false)
  const planReceipt = useQuery<ImagePlanSaveState>({ queryKey: keys.imagePlanSave(image.caseId, image.id), queryFn: async () => IDLE_CALIBRATION_SAVE,
    enabled: false, initialData: IDLE_CALIBRATION_SAVE, gcTime: Infinity }).data
  const receipt = isDistanceCommand(planReceipt.edit) ? planReceipt : IDLE_CALIBRATION_SAVE
  const deletion = useQuery<ImageDeletionState>({ queryKey: keys.imageDeletion(image.caseId, image.id), queryFn: async () => IDLE_DELETION,
    enabled: false, initialData: IDLE_DELETION, gcTime: Infinity }).data
  const deleting = caseLocked || ["deleting", "checking", "uncertain", "deleted"].includes(deletion.phase)
  const planQuery = useQuery(imagePlanQueryOptions(client, identity, { enabled: image.status === "READY" && !deleting }))
  const plan = planQuery.data
  const loadingSaved = recoveringSaved && (planQuery.isPending || planQuery.isFetching)
  useEffect(() => {
    if (recoveringSaved && planQuery.isSuccess && !planQuery.isFetching) setRecoveringSaved(false)
  }, [recoveringSaved, planQuery.isSuccess, planQuery.isFetching])
  const otherIntent = useOtherImagePlanDraft(image.caseId, image.id, "distance")
  const recovery = isDistanceCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved"
    ? distanceEditorFromCommand(receipt.edit) : null
  const draftIsStaleGuide = draft?.kind === "distance-create" && draft.untouched && draft.baseRevision !== plan?.revision
  const editor = (draftIsStaleGuide ? null : draft) ?? recovery
  const issue = calibrationGeometryIssue(image)
  const save = useMutation({ mutationFn: ({ input, checkOnly }: { input: SaveDistanceInput; checkOnly?: boolean }) => checkOnly
    ? checkImagePlanSave(client, identity, input) : requestPlanEditSave(client, identity, input), retry: false })
  const locked = save.isPending || ["saving", "checking", "uncertain"].includes(planReceipt.phase)
  const target = editor && editor.kind !== "distance-create" && plan ? distanceLine(plan, editor.id) : null
  const targetEditable = !editor || editor.kind === "distance-create" || Boolean(target && !target.locked)
  const canEdit = image.status === "READY" && ready && !caseLocked && !calibrationEditing && !issue && !deleting && !locked && !recoveringSaved
    && receipt.phase !== "conflict" && (!editor || !plan || editor.baseRevision === plan.revision)
    && targetEditable
    && !otherIntent && !planQuery.isFetching && !planQuery.isError && hasConfirmedImageScale(plan, image.id)
    && Boolean(plan && hasUniquePlanObjectIds(plan.document))
  // Viewing a saved selection does not require permission to write or an idle read.
  const canSelect = image.status === "READY" && ready && !calibrationEditing && !deleting && !locked
    && Boolean(plan && hasUniquePlanObjectIds(plan.document))
  const hasChanges = Boolean(editor && distanceEditorHasChanges(editor, plan))
  const needsRebase = Boolean(editor && plan && editor.baseRevision !== plan.revision)
  const input = editor && distanceCommandFromEditor(editor)
  const canSave = canEdit && hasChanges && !needsRebase && Boolean(input)
  const canCreate = canEdit && !hasChanges && (receipt.phase === "idle" || receipt.phase === "saved")
    && Boolean(plan && plan.document.objects.length < 500)
  const canRetryRead = image.status === "READY" && !deleting && !locked && !otherIntent && !planQuery.isFetching
  const selectedId = editor?.id ?? (plan && selection?.imageId === image.id && distanceLine(plan, selection.id) ? selection.id : null)

  function currentEditor(): DistanceEditor | null {
    const stored = client.getQueryData<DistanceEditor | null>(draftKey)
    if (stored) return stored
    const latest = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    return latest && isDistanceCommand(latest.edit) && latest.phase !== "idle" && latest.phase !== "saved"
      ? distanceEditorFromCommand(latest.edit) : null
  }
  function editableNow(): ImagePlan | null {
    const current = client.getQueryData<ImagePlan>(planKey)
    return mounted.current && !submitting.current && canEdit && current && hasConfirmedImageScale(current, image.id) && hasUniquePlanObjectIds(current.document) && !isPlanImageDeleted(client, identity)
      && !isImageDeletionLocked(client, image.caseId, image.id) && !hasOtherImagePlanDraft(client, image.caseId, image.id, "distance")
      && !isCalibrationSaveLocked(client, image.caseId, image.id) && !isCaseDeletionLocked(client, image.caseId)
      && client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))?.phase !== "conflict"
      && client.getQueryState(planKey)?.fetchStatus !== "fetching" && client.getQueryState(planKey)?.status !== "error" ? current : null
  }
  function select(id: string | null): boolean {
    const current = client.getQueryData<ImagePlan>(planKey), active = currentEditor()
    if (!mounted.current || submitting.current || !canSelect || !current || !hasUniquePlanObjectIds(current.document)
      || isPlanImageDeleted(client, identity) || isImageDeletionLocked(client, image.caseId, image.id)
      || isCalibrationSaveLocked(client, image.caseId, image.id)
      || (active && active.id !== id && distanceEditorHasChanges(active, current)) || (id && !distanceLine(current, id))) return false
    if (active && active.id !== id) client.setQueryData(draftKey, null)
    setSelection(id ? { imageId: image.id, id } : null)
    return true
  }
  function beginCreate(label: string | null | ((index: number) => string), afterCalibrationRevision?: number): boolean {
    const current = editableNow(), active = currentEditor()
    if (!canCreate || !current || active && distanceEditorHasChanges(active, current) || current.document.objects.length >= 500) return false
    const savedLines = current.document.objects.filter(object => object.type === "LINE")
    if (afterCalibrationRevision !== undefined && (current.revision !== afterCalibrationRevision || savedLines.length)) return false
    const latestReceipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    if (latestReceipt?.edit && isDistanceCommand(latestReceipt.edit) && latestReceipt.phase !== "idle" && latestReceipt.phase !== "saved") return false
    if (!image.widthPx || !image.heightPx) return false
    const visibleLines = savedLines.filter(line => line.visible !== false)
    const reference = visibleLines.at(-1)
    const geometry = placeDistanceAtReference(reference ?? null, { widthPx: image.widthPx, heightPx: image.heightPx }, visibleLines)
    const candidate = typeof label === "function" ? nextDistanceLabel(current.document.objects, label) : label
    if (typeof label === "function" && candidate === null) return false
    const name = PlanLineInputSchema.shape.label.safeParse(candidate)
    if (!name.success) return false
    if (!closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "distance")) return false
    const id = crypto.randomUUID()
    client.setQueryData<DistanceEditor>(draftKey, (): DistanceEditor => ({ kind: "distance-create", id, baseRevision: current.revision,
      label: name.data ?? null, geometry, referenceId: selectedId ?? reference?.id, untouched: afterCalibrationRevision !== undefined }))
    setSelection({ imageId: image.id, id })
    return true
  }
  function acceptGuideForNewDistance(): boolean {
    const current = editableNow(), active = currentEditor()
    if (!current || current.document.objects.length > 498 || active?.kind !== "distance-create"
      || !active.untouched || !active.geometry || active.baseRevision !== current.revision) return false
    client.setQueryData<DistanceEditor>(draftKey, (): DistanceEditor => ({ ...active, untouched: false }))
    return true
  }
  function beginExisting(id: string, kind: "distance-update" | "distance-delete", expectedRevision?: number): boolean {
    const current = editableNow()
    const active = currentEditor()
    if (!current || expectedRevision !== undefined && current.revision !== expectedRevision
      || active && !(kind === "distance-delete" && active.kind === "distance-update" && active.id === id)) return false
    const line = distanceLine(current, id)
    if (!line || line.locked) return false
    if (kind === "distance-delete") {
      const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
      if (receipt?.phase === "error" && receipt.edit) {
        if (receipt.edit.kind !== "distance-update" || receipt.edit.id !== id || !discardPlanEditSave(client, identity, receipt.edit)) return false
      }
    }
    if (!closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "distance")) return false
    client.setQueryData<DistanceEditor>(draftKey, (): DistanceEditor => kind === "distance-delete" ? { kind, id: line.id, baseRevision: current.revision }
      : { kind, id: line.id, baseRevision: current.revision, geometry: { start: { ...line.start }, end: { ...line.end } } })
    setSelection({ imageId: image.id, id: line.id })
    return true
  }
  function changeGeometry(geometry: DistanceGeometry, expectedId?: string): boolean {
    const plan = editableNow()
    if (!plan) return false
    const current = currentEditor(), start = PlanPointSchema.safeParse(geometry.start), end = PlanPointSchema.safeParse(geometry.end)
    if (!current || current.baseRevision !== plan.revision || (expectedId !== undefined && expectedId !== current.id)
      || current.kind === "distance-delete" || !start.success || !end.success) return false
    if (current.kind === "distance-update") {
      const line = distanceLine(plan, current.id)
      if (!line || line.locked) return false
    }
    const next = { start: start.data, end: end.data }
    if (current.geometry && sameDistanceGeometry(current.geometry, next)) return false
    client.setQueryData<DistanceEditor>(draftKey, (): DistanceEditor => current.kind === "distance-create"
      ? { ...current, geometry: next, untouched: false } : { ...current, geometry: next })
    return true
  }
  function command(): SaveDistanceInput | null {
    const current = editableNow(), active = currentEditor()
    if (current && active && active.kind !== "distance-create") {
      const line = distanceLine(current, active.id)
      if (!line || line.locked) return null
    }
    return current && active && active.baseRevision === current.revision && distanceEditorHasChanges(active, current) ? distanceCommandFromEditor(active) : null
  }
  function nudge(target: DistanceAdjustmentTarget, event: DistanceArrow, mirrored: boolean, expectedId: string): boolean {
    const active = currentEditor()
    if (!active || active.id !== expectedId || active.kind === "distance-delete" || !active.geometry || !image.widthPx || !image.heightPx) return false
    const dimensions = { widthPx: image.widthPx, heightPx: image.heightPx }
    const next = distanceMarkerFromKeyboard({ kind: "line", start: imagePointToPixels(active.geometry.start, dimensions), end: imagePointToPixels(active.geometry.end, dimensions) }, target, event, dimensions, mirrored)
    return Boolean(next && changeGeometry({ start: imagePointToNormalized(next.start, dimensions), end: imagePointToNormalized(next.end, dimensions) }, expectedId))
  }
  function discard(): boolean {
    if (!mounted.current || submitting.current || save.isPending || deleting || isCalibrationSaveLocked(client, image.caseId, image.id) || isCaseDeletionLocked(client, image.caseId)) return false
    const current = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const own = current && isDistanceCommand(current.edit) ? current.edit : null
    const active = currentEditor()
    if (!active && !own) return true
    if (isImageDeletionLocked(client, image.caseId, image.id)) return false
    if (own && current && ["error", "conflict"].includes(current.phase) && !discardPlanEditSave(client, identity, own)) return false
    const cached = client.getQueryData<ImagePlan>(planKey)
    const reload = current?.phase === "conflict" && (current.currentRevision === undefined || !cached || cached.revision < current.currentRevision)
      || client.getQueryState(planKey)?.status === "error"
    if (client.getQueryData(draftKey) !== undefined) client.setQueryData(draftKey, null)
    const reference = cached && active?.kind === "distance-create" && active.referenceId && distanceLine(cached, active.referenceId)
    setSelection(reference ? { imageId: image.id, id: reference.id } : null)
    if (reload) {
      setRecoveringSaved(true)
      // Discard may already have started the refresh. Join it without cancelling
      // or issuing a second GET, and keep the recovery panel until it settles.
      void (client.getQueryState(planKey)?.fetchStatus === "fetching"
        ? client.refetchQueries({ queryKey: planKey, exact: true }, { cancelRefetch: false })
        : client.resetQueries({ queryKey: planKey, exact: true }))
    }
    return true
  }
  async function submit(checkOnly = false): Promise<ImagePlanSaveState | null> {
    if (!mounted.current || submitting.current || deleting || isPlanImageDeleted(client, identity) || isCaseDeletionLocked(client, image.caseId)) return null
    const current = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const input = checkOnly ? current?.phase === "uncertain" && isDistanceCommand(current.edit) ? current.edit : null : command()
    if (!input) return null
    const previousLines = input.kind === "distance-delete"
      ? client.getQueryData<ImagePlan>(planKey)?.document.objects.filter(object => object.type === "LINE" && object.visible !== false)
      : undefined
    submitting.current = true
    try {
      const result = await save.mutateAsync({ input, checkOnly })
      const confirmed = client.getQueryData<ImagePlan>(planKey)
      if (result.phase === "saved" && mounted.current && confirmed && !currentEditor() && !isPlanImageDeleted(client, identity)) {
        let selected = distanceLine(confirmed, input.id)
        if (input.kind === "distance-delete") {
          const remaining = confirmed.document.objects.filter(object => object.type === "LINE").filter(line => line.visible !== false)
          const previousIndex = previousLines?.findIndex(line => line.id.toLowerCase() === input.id.toLowerCase()) ?? -1
          selected = remaining[Math.max(0, Math.min(previousIndex, remaining.length - 1))] ?? null
        }
        setSelection(selected ? { imageId: image.id, id: selected.id } : null)
      }
      return result
    } finally { submitting.current = false }
  }
  function refreshRead() {
    if (!mounted.current || !canRetryRead || submitting.current || isCalibrationSaveLocked(client, image.caseId, image.id)
      || isImageDeletionLocked(client, image.caseId, image.id) || isCaseDeletionLocked(client, image.caseId)) return
    return planQuery.refetch()
  }
  function check() {
    if (mounted.current && !deleting && !isPlanImageDeleted(client, identity) && !isCaseDeletionLocked(client, image.caseId)
      && receipt.phase === "uncertain" && isDistanceCommand(receipt.edit) && !save.isPending) {
      save.mutate({ input: receipt.edit, checkOnly: true })
    }
  }

  return { planQuery, plan, planReceipt, receipt, editor, selectedId, hasChanges, needsRebase, canEdit, canSelect, canCreate, canSave, canRetryRead, locked, deleting, loadingSaved, recoveringSaved, otherIntent, issue,
    select, beginCreate, acceptGuideForNewDistance, beginUpdate: (id: string) => beginExisting(id, "distance-update"), beginDelete: (id: string, expectedRevision?: number) => beginExisting(id, "distance-delete", expectedRevision),
    changeGeometry, nudge, placeLine: () => changeGeometry(centeredDistanceGeometry()), command, discard, save, submit, refreshRead, check }
}

export { useImageDistance }
export type ImageDistanceState = ReturnType<typeof useImageDistance>
