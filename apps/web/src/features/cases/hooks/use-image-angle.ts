"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { angleCommandFromEditor, angleEditorFromCommand, angleEditorGeometry, angleEditorHasChanges, angleObject,
  changeAngleGeometry, nextAngleLabel, placeAnglePoint, type AngleEditor } from "../lib/angle-editor"
import type { AngleGeometry } from "../lib/angle-geometry"
import { angleFromKeyboard, angleInNormalized, angleInPixels, type AngleAdjustmentTarget } from "../lib/angle-interaction"
import { angleWithDegrees } from "../lib/angle-value-adjustment"
import { centeredAngleGeometry, type AnglePlacementStep } from "../lib/angle-placement"
import { calibrationGeometryIssue } from "../lib/calibration-editor"
import { hasConfirmedImageScale } from "../lib/calibration-product-state"
import { isCalibrationSaveLocked, isPlanImageDeleted, type ImagePlanSaveState } from "../lib/calibration-save-state"
import { isCaseDeletionLocked } from "../lib/case-deletion"
import { IDLE_DELETION, isImageDeletionLocked, type ImageDeletionState } from "../lib/image-deletion"
import { closeOtherCleanMeasurementEditor, hasOtherImagePlanDraft } from "../lib/image-plan-draft"
import { imagePlanQueryOptions } from "../lib/image-plan-query-options"
import { discardPlanEditSave, isImagePlanSaveInFlight, requestPlanEditSave } from "../lib/image-plan-saving"
import { hasUniquePlanObjectIds, isAngleCommand, type SaveAngleInput } from "../schemas/image-plan-command.schema"
import { PlanAngleInputSchema, type ImagePlan } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import type { ImagePoint } from "../types/case-workspace"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useAngleSaveRecovery } from "./use-angle-save-recovery"
import { useOtherImagePlanDraft } from "./use-image-plan-drafts"
import { useWorkspaceCacheValue, useWorkspaceDraft } from "./use-workspace-draft"

function useImageAngle(image: CaseImage, ready: boolean, caseLocked: boolean, options: { active: boolean; calibrationEditing: boolean }) {
  const client = useQueryClient()
  const identity = { caseId: image.caseId, imageId: image.id }
  const draftKey = keys.imageAngleDraft(image.caseId, image.id), planKey = keys.imagePlan(image.caseId, image.id)
  const selectionKey = keys.imageAngleSelection(image.caseId, image.id)
  const draft = useWorkspaceDraft<AngleEditor>("image-angle-draft", image.caseId, image.id)
  const selection = useWorkspaceCacheValue<string>("image-angle-selection", image.caseId, image.id)
  const draftQuery = client.getQueryCache().find({ queryKey: draftKey, exact: true })
  const available = ready && !caseLocked && !options.calibrationEditing && image.status === "READY"
  const scope = useRef({ client, ...identity, draftQuery, active: options.active, available, generation: 0 })
  if (scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id
    || scope.current.draftQuery !== draftQuery || scope.current.active !== options.active || scope.current.available !== available) {
    scope.current = { client, ...identity, draftQuery, active: options.active, available, generation: scope.current.generation + 1 }
  }
  const generation = scope.current.generation
  const mounted = useRef(false), submitting = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const captured = useAngleSaveRecovery(image, caseLocked)
  const deletion = useQuery<ImageDeletionState>({ queryKey: keys.imageDeletion(image.caseId, image.id), queryFn: async () => IDLE_DELETION,
    enabled: false, initialData: IDLE_DELETION, gcTime: Infinity }).data
  const deleting = caseLocked || ["deleting", "checking", "uncertain", "deleted"].includes(deletion.phase)
  const planQuery = useQuery(imagePlanQueryOptions(client, identity, { enabled: image.status === "READY" && !deleting }))
  const plan = planQuery.data
  const otherIntent = useOtherImagePlanDraft(image.caseId, image.id, "angle")
  const editor = draft ?? (captured.active && captured.command ? angleEditorFromCommand(captured.command) : null)
  const issue = calibrationGeometryIssue(image)
  const save = useMutation({ mutationFn: (input: SaveAngleInput) => requestPlanEditSave(client, identity, input), retry: false })
  const locked = save.isPending || captured.pending || isCalibrationSaveLocked(client, image.caseId, image.id)
  const target = editor && editor.kind !== "angle-create" && plan ? angleObject(plan, editor.id) : null
  const targetEditable = !editor || editor.kind === "angle-create" || Boolean(target && !target.locked)
  const hasChanges = Boolean(editor && angleEditorHasChanges(editor, plan))
  const needsRebase = Boolean(editor && plan && editor.baseRevision !== plan.revision)
  const canSelect = options.active && image.status === "READY" && ready && !options.calibrationEditing && !deleting && !locked && !otherIntent
    && Boolean(plan && hasUniquePlanObjectIds(plan.document))
  const canEdit = canSelect && !issue && !planQuery.isFetching && !planQuery.isError && targetEditable && !needsRebase
    && captured.receipt.phase !== "conflict" && hasConfirmedImageScale(plan, image.id)
  const canSave = canEdit && hasChanges && Boolean(editor && angleCommandFromEditor(editor))
  const canRetryRead = options.active && ready && image.status === "READY" && !deleting && !locked && !otherIntent && !planQuery.isFetching
  const selectedId = editor?.id ?? (plan && selection ? angleObject(plan, selection)?.id ?? null : null)

  // Check both scope and Query identity. Clearing/replacing this organization's
  // cache invalidates old callbacks even if the same image is mounted again.
  function live() {
    return mounted.current && scope.current.generation === generation && scope.current.client === client && scope.current.caseId === image.caseId && scope.current.imageId === image.id
      && Boolean(draftQuery && scope.current.draftQuery === draftQuery && client.getQueryCache().find({ queryKey: draftKey, exact: true }) === draftQuery)
      && !isPlanImageDeleted(client, identity) && !isCaseDeletionLocked(client, image.caseId)
      && !["deleting", "checking", "uncertain", "deleted"].includes(client.getQueryData<ImageDeletionState>(keys.imageDeletion(image.caseId, image.id))?.phase ?? "idle")
  }
  function currentEditor(): AngleEditor | null {
    const stored = client.getQueryData<AngleEditor | null>(draftKey)
    if (stored) return stored
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    return receipt && isAngleCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved"
      ? angleEditorFromCommand(receipt.edit) : null
  }
  function editableNow(): ImagePlan | null {
    const current = client.getQueryData<ImagePlan>(planKey)
    const cachedImage = client.getQueryData<CaseImage[]>(keys.images(image.caseId))?.find(item => item.id === image.id)
    return live() && canEdit && !submitting.current && current && hasConfirmedImageScale(current, image.id) && hasUniquePlanObjectIds(current.document)
      && (!cachedImage || cachedImage.status === "READY" && !calibrationGeometryIssue(cachedImage))
      && !isImageDeletionLocked(client, image.caseId, image.id) && !isImagePlanSaveInFlight(client, identity)
      && !hasOtherImagePlanDraft(client, image.caseId, image.id, "angle")
      && client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))?.phase !== "conflict"
      && client.getQueryState(planKey)?.fetchStatus !== "fetching" && client.getQueryState(planKey)?.status !== "error" ? current : null
  }
  function select(id: string | null): boolean {
    const current = client.getQueryData<ImagePlan>(planKey), active = currentEditor()
    const sameSelection = active?.id.toLowerCase() === id?.toLowerCase()
    if (!live() || !canSelect || submitting.current || !current || !hasUniquePlanObjectIds(current.document)
      || isImageDeletionLocked(client, image.caseId, image.id) || isImagePlanSaveInFlight(client, identity)
      || hasOtherImagePlanDraft(client, image.caseId, image.id, "angle")
      || (active && !sameSelection && angleEditorHasChanges(active, current))) return false
    const selected = id ? angleObject(current, id) : null
    if (id && !selected) return false
    if (!closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "angle")) return false
    if (active && !sameSelection) client.setQueryData(draftKey, null)
    client.setQueryData(selectionKey, selected?.id ?? null)
    return true
  }
  function beginCreate(name: string | null | ((index: number) => string)): boolean {
    const current = editableNow()
    if (!current || currentEditor() || current.document.objects.length >= 500) return false
    const candidate = typeof name === "function" ? nextAngleLabel(current.document.objects, name) : name
    if (typeof name === "function" && candidate === null) return false
    const label = PlanAngleInputSchema.shape.label.safeParse(candidate)
    if (!label.success) return false
    if (!closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "angle")) return false
    const id = crypto.randomUUID()
    client.setQueryData<AngleEditor>(draftKey, (): AngleEditor => ({ kind: "angle-create", baseRevision: current.revision, id, label: label.data ?? null, placement: { step: "start" } }))
    client.setQueryData(selectionKey, id)
    return true
  }
  function beginExisting(id: string, kind: "angle-update" | "angle-delete", expectedRevision?: number): boolean {
    const current = editableNow(), active = currentEditor()
    if (!current || (expectedRevision !== undefined && current.revision !== expectedRevision)) return false
    const target = angleObject(current, id)
    if (!target || target.locked) return false
    if (active?.kind === kind && active.id.toLowerCase() === id.toLowerCase()) return active.baseRevision === current.revision
    if (active && angleEditorHasChanges(active, current)) return false
    const input: SaveAngleInput = kind === "angle-delete" ? { kind, id: target.id, baseRevision: current.revision }
      : { kind, id: target.id, baseRevision: current.revision, start: target.start, vertex: target.vertex, end: target.end }
    // Legacy geometry may be readable while not valid for editing.
    const next = angleEditorFromCommand(input)
    if (!angleCommandFromEditor(next)) return false
    if (!closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "angle")) return false
    client.setQueryData(draftKey, next)
    client.setQueryData(selectionKey, target.id)
    return true
  }
  // Only the confirmed dialog may replace a dirty update with deletion. Bind
  // that consent to the exact draft and revision seen when the dialog opened.
  function confirmDelete(id: string, baseRevision: number, expectedEditor: AngleEditor | null): boolean {
    const current = editableNow(), active = currentEditor()
    if (!current || current.revision !== baseRevision || JSON.stringify(active) !== JSON.stringify(expectedEditor)
      || (active && (active.kind !== "angle-update" || active.id.toLowerCase() !== id.toLowerCase() || active.baseRevision !== baseRevision))) return false
    const target = angleObject(current, id)
    if (!target || target.locked || !closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "angle")) return false
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    if (receipt && receipt.phase !== "idle" && receipt.phase !== "saved") {
      if (receipt.phase !== "error" || !isAngleCommand(receipt.edit) || receipt.edit.id.toLowerCase() !== target.id.toLowerCase()
        || !discardPlanEditSave(client, identity, receipt.edit)) return false
    }
    client.setQueryData<AngleEditor>(draftKey, { kind: "angle-delete", id: target.id, baseRevision })
    client.setQueryData(selectionKey, target.id)
    return true
  }
  // Entry resumes an existing draft; it never implicitly starts a second angle.
  function open(name: (index: number) => string): "create" | "edit" | "select" | null {
    const current = editableNow()
    if (!current) return null
    const active = currentEditor()
    if (active) return active.kind === "angle-create" ? "create" : active.kind === "angle-update" ? "edit" : null
    const visible = current.document.objects.filter(object => object.type === "ANGLE" && object.visible !== false)
    if (!visible.length) return beginCreate(name) ? "create" : null
    if (visible.length === 1) {
      const target = visible[0]
      if (target.locked) return select(target.id) ? "select" : null
      return beginExisting(target.id, "angle-update") ? "edit" : null
    }
    const selected = client.getQueryData<string | null>(selectionKey)
    return select(selected && angleObject(current, selected) ? selected : null) ? "select" : null
  }
  function beginNew(name: (index: number) => string): boolean {
    const current = editableNow(), active = currentEditor()
    if (!current || current.document.objects.length >= 500 || (active && angleEditorHasChanges(active, current))) return false
    return closeCleanEditor() && beginCreate(name)
  }
  function update(expectedId: string, change: (current: AngleEditor) => AngleEditor | null): boolean {
    const current = editableNow(), active = currentEditor()
    if (!current || !active || active.id !== expectedId || active.baseRevision !== current.revision) return false
    if (active.kind !== "angle-create") {
      const target = angleObject(current, active.id)
      if (!target || target.locked) return false
    }
    const next = change(active)
    if (!next) return false
    client.setQueryData(draftKey, next)
    return true
  }
  function command(): SaveAngleInput | null {
    const current = editableNow(), active = currentEditor()
    if (!current || !active || active.baseRevision !== current.revision || !angleEditorHasChanges(active, current)) return null
    if (active.kind !== "angle-create") {
      const target = angleObject(current, active.id)
      if (!target || target.locked) return null
    }
    return angleCommandFromEditor(active)
  }
  function closeCleanEditor(): boolean {
    if (!live()) return false
    const active = currentEditor(), current = client.getQueryData<ImagePlan>(planKey)
    if (!active) return true
    if (captured.active || submitting.current || isImagePlanSaveInFlight(client, identity) || angleEditorHasChanges(active, current)) return false
    client.setQueryData(draftKey, null)
    return true
  }
  function discard(): boolean {
    if (!live() || submitting.current || isImageDeletionLocked(client, image.caseId, image.id) || isImagePlanSaveInFlight(client, identity)) return false
    const active = currentEditor()
    if (JSON.stringify(active) !== JSON.stringify(editor)) return false
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const own = receipt && isAngleCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved" ? receipt.edit : null
    if (own && !discardPlanEditSave(client, identity, own)) return false
    if (!active) return true
    client.setQueryData(draftKey, null)
    const current = client.getQueryData<ImagePlan>(planKey)
    client.setQueryData(selectionKey, current && angleObject(current, active.id) ? active.id : null)
    return true
  }
  async function submit(): Promise<ImagePlanSaveState | null> {
    if (!live() || submitting.current) return null
    const input = command()
    if (!input) return null
    submitting.current = true
    try {
      const result = await save.mutateAsync(input)
      return live() ? result : { phase: "error", code: "CLINICAL_CONTEXT_CHANGED" }
    }
    finally { submitting.current = false }
  }

  function nudge(target: AngleAdjustmentTarget, event: { key: string; shiftKey: boolean; altKey: boolean }, mirrored: boolean, expectedId: string) {
    if (!image.widthPx || !image.heightPx) return false
    const dimensions = { widthPx: image.widthPx, heightPx: image.heightPx }
    return update(expectedId, active => {
      const geometry = angleEditorGeometry(active)
      if (!geometry) return null
      const next = angleFromKeyboard(angleInPixels(geometry, dimensions), target, event, dimensions, mirrored)
      return next ? changeAngleGeometry(active, angleInNormalized(next, dimensions, geometry)) : null
    })
  }

  function refreshRead() {
    if (!live() || !canRetryRead || submitting.current || isCalibrationSaveLocked(client, image.caseId, image.id)
      || isImageDeletionLocked(client, image.caseId, image.id) || hasOtherImagePlanDraft(client, image.caseId, image.id, "angle")) return
    return planQuery.refetch()
  }

  function setDegrees(degrees: number, expectedId: string) {
    return update(expectedId, active => {
      const geometry = angleEditorGeometry(active)
      const next = geometry && angleWithDegrees(geometry, degrees)
      return next ? changeAngleGeometry(active, next) : null
    })
  }

  return { planQuery, plan, editor, selectedId, contextGeneration: generation, geometry: editor ? angleEditorGeometry(editor) : null,
    placement: editor?.kind === "angle-create" ? editor.placement : null,
    receipt: captured.receipt, recovery: { ...captured, discard }, hasChanges, needsRebase, canEdit, canSelect, canSave, canRetryRead,
    canCreate: canEdit && !editor && Boolean(plan && plan.document.objects.length < 500), locked, deleting, otherIntent, issue,
    select, open, beginCreate, beginNew, beginUpdate: (id: string) => beginExisting(id, "angle-update"),
    beginDelete: (id: string, revision?: number) => beginExisting(id, "angle-delete", revision), confirmDelete,
    changeGeometry: (geometry: AngleGeometry, expectedId: string) => update(expectedId, editor => changeAngleGeometry(editor, geometry)),
    placePoint: (point: ImagePoint, expectedId: string, step: AnglePlacementStep) => update(expectedId, editor =>
      editor.kind === "angle-create" && editor.placement.step === step ? placeAnglePoint(editor, point) : null),
    placeCentered: (expectedId: string, step: AnglePlacementStep) => update(expectedId, editor =>
      editor.kind === "angle-create" && editor.placement.step === step ? changeAngleGeometry(editor, centeredAngleGeometry()) : null),
    command, closeCleanEditor, discard, save, submit, nudge, refreshRead, setDegrees }
}

export { useImageAngle }
export type ImageAngleState = ReturnType<typeof useImageAngle>
