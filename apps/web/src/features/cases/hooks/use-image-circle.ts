"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { calibrationGeometryIssue } from "../lib/calibration-editor"
import { hasConfirmedImageScale } from "../lib/calibration-product-state"
import { isCalibrationSaveLocked, isPlanImageDeleted, type ImagePlanSaveState } from "../lib/calibration-save-state"
import { isCaseDeletionLocked } from "../lib/case-deletion"
import { changeCircleGeometry, circleCommandFromEditor, circleEditorFromCommand, circleEditorGeometry, circleEditorHasChanges, circleEditorMatchesCommand,
  circleObject, nextCircleLabel, placeCirclePoint, type CircleEditor, type CirclePlacementStep } from "../lib/circle-editor"
import { circleHasValidRadius, type CircleGeometry } from "../lib/circle-geometry"
import { circleFromKeyboard, circleInNormalized, circleInPixels, type CircleAdjustmentTarget } from "../lib/circle-interaction"
import { centeredCircleGeometry } from "../lib/circle-placement"
import { IDLE_DELETION, isImageDeletionLocked, type ImageDeletionState } from "../lib/image-deletion"
import { closeOtherCleanMeasurementEditor, hasOtherImagePlanDraft } from "../lib/image-plan-draft"
import { imagePlanQueryOptions } from "../lib/image-plan-query-options"
import { discardPlanEditSave, isImagePlanSaveInFlight, requestPlanEditSave } from "../lib/image-plan-saving"
import { hasUniquePlanObjectIds, isCircleCommand, type SaveCircleInput } from "../schemas/image-plan-command.schema"
import { PlanCircleInputSchema, type ImagePlan } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import type { ImagePoint } from "../types/case-workspace"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useCircleSaveRecovery } from "./use-circle-save-recovery"
import { useOtherImagePlanDraft } from "./use-image-plan-drafts"
import { useWorkspaceCacheValue, useWorkspaceDraft } from "./use-workspace-draft"

type CircleDeleteCommand = Extract<SaveCircleInput, { kind: "circle-delete" }>

function geometryContextOf(image: CaseImage): string {
  return JSON.stringify([image.widthPx, image.heightPx, image.kind, image.pixelSpacingMm, image.imagerPixelSpacingMm])
}

function useImageCircle(image: CaseImage, ready: boolean, caseLocked: boolean, options: { active: boolean; calibrationEditing: boolean; toolActive?: boolean }) {
  const client = useQueryClient()
  const identity = { caseId: image.caseId, imageId: image.id }
  const draftKey = keys.imageCircleDraft(image.caseId, image.id)
  const selectionKey = keys.imageCircleSelection(image.caseId, image.id)
  const planKey = keys.imagePlan(image.caseId, image.id)
  const draft = useWorkspaceDraft<CircleEditor>("image-circle-draft", image.caseId, image.id)
  const selection = useWorkspaceCacheValue<string>("image-circle-selection", image.caseId, image.id)
  const draftQuery = client.getQueryCache().find({ queryKey: draftKey, exact: true })
  const captured = useCircleSaveRecovery(image, caseLocked)
  const deletion = useQuery<ImageDeletionState>({ queryKey: keys.imageDeletion(image.caseId, image.id), queryFn: async () => IDLE_DELETION,
    enabled: false, initialData: IDLE_DELETION, gcTime: Infinity }).data
  const deleting = caseLocked || ["deleting", "checking", "uncertain", "deleted"].includes(deletion.phase)
  const available = ready && !deleting && !options.calibrationEditing && image.status === "READY"
  const geometryContext = geometryContextOf(image)
  const scope = useRef({ client, ...identity, draftQuery, active: options.active, toolActive: options.toolActive, available, geometryContext, generation: 0 })
  if (scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id
    || scope.current.draftQuery !== draftQuery || scope.current.active !== options.active || scope.current.toolActive !== options.toolActive || scope.current.available !== available
    || scope.current.geometryContext !== geometryContext) {
    scope.current = { client, ...identity, draftQuery, active: options.active, toolActive: options.toolActive, available, geometryContext, generation: scope.current.generation + 1 }
  }
  const generation = scope.current.generation
  const mounted = useRef(false)
  const submitting = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const planQuery = useQuery(imagePlanQueryOptions(client, identity, { enabled: options.active && image.status === "READY" && !deleting }))
  const plan = planQuery.data
  const otherIntent = useOtherImagePlanDraft(image.caseId, image.id, "circle")
  const editor = draft ?? (captured.active && captured.command ? circleEditorFromCommand(captured.command) : null)
  const issue = calibrationGeometryIssue(image)
  const save = useMutation({ mutationFn: (input: SaveCircleInput) => requestPlanEditSave(client, identity, input), retry: false })
  const locked = save.isPending || captured.pending || isCalibrationSaveLocked(client, image.caseId, image.id)
  const target = editor && editor.kind !== "circle-create" && plan ? circleObject(plan, editor.id) : null
  const targetEditable = !editor || editor.kind === "circle-create" || Boolean(target && !target.locked)
  const hasChanges = Boolean(editor && circleEditorHasChanges(editor, plan))
  const needsRebase = Boolean(editor && plan && editor.baseRevision !== plan.revision)
  const canSelect = options.active && available && !locked && !otherIntent
    && Boolean(plan && hasUniquePlanObjectIds(plan.document))
  const canEdit = canSelect && !issue && !planQuery.isFetching && !planQuery.isError && targetEditable && !needsRebase
    && captured.receipt.phase !== "conflict" && hasConfirmedImageScale(plan, image.id)
  const canSave = canEdit && hasChanges && Boolean(editor && circleCommandFromEditor(editor))
  const canRetryRead = options.active && available && !locked && !otherIntent && !planQuery.isFetching
  const selectedId = editor?.id ?? (plan && selection ? circleObject(plan, selection)?.id ?? null : null)

  // A generation prevents old gestures from becoming valid after leaving and
  // returning to the same image. Query identity also protects cache replacement.
  function live() {
    return mounted.current && scope.current.generation === generation && scope.current.client === client
      && scope.current.caseId === image.caseId && scope.current.imageId === image.id
      && Boolean(draftQuery && scope.current.draftQuery === draftQuery && client.getQueryCache().find({ queryKey: draftKey, exact: true }) === draftQuery)
      && !isPlanImageDeleted(client, identity) && !isCaseDeletionLocked(client, image.caseId)
      && !["deleting", "checking", "uncertain", "deleted"].includes(client.getQueryData<ImageDeletionState>(keys.imageDeletion(image.caseId, image.id))?.phase ?? "idle")
  }
  function currentEditor(): CircleEditor | null {
    const stored = client.getQueryData<CircleEditor | null>(draftKey)
    if (stored) return stored
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    return receipt && isCircleCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved"
      ? circleEditorFromCommand(receipt.edit) : null
  }
  function editableNow(): ImagePlan | null {
    const current = client.getQueryData<ImagePlan>(planKey)
    const cachedImage = client.getQueryData<CaseImage[]>(keys.images(image.caseId))?.find(item => item.id === image.id)
    return live() && canEdit && !submitting.current && current && current.revision === plan?.revision
      && hasConfirmedImageScale(current, image.id) && hasUniquePlanObjectIds(current.document)
      && (!cachedImage || cachedImage.status === "READY" && !calibrationGeometryIssue(cachedImage) && geometryContextOf(cachedImage) === geometryContext)
      && !isCalibrationSaveLocked(client, image.caseId, image.id) && !isImagePlanSaveInFlight(client, identity)
      && !hasOtherImagePlanDraft(client, image.caseId, image.id, "circle")
      && client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))?.phase !== "conflict"
      && client.getQueryState(planKey)?.fetchStatus !== "fetching" && client.getQueryState(planKey)?.status !== "error" ? current : null
  }
  function select(id: string | null): boolean {
    const current = client.getQueryData<ImagePlan>(planKey)
    const active = currentEditor()
    const sameSelection = active?.id.toLowerCase() === id?.toLowerCase()
    if (!live() || !canSelect || submitting.current || !current || current.revision !== plan?.revision || !hasUniquePlanObjectIds(current.document)
      || isCalibrationSaveLocked(client, image.caseId, image.id) || isImagePlanSaveInFlight(client, identity)
      || hasOtherImagePlanDraft(client, image.caseId, image.id, "circle")
      || (active && !sameSelection && circleEditorHasChanges(active, current))) return false
    const selected = id ? circleObject(current, id) : null
    if (id && !selected) return false
    if (!closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "circle")) return false
    if (active && !sameSelection) client.setQueryData(draftKey, null)
    client.setQueryData(selectionKey, selected?.id ?? null)
    return true
  }
  function beginCreate(name: string | null | ((index: number) => string)): boolean {
    const current = editableNow()
    if (!current || currentEditor() || current.document.objects.length >= 500) return false
    const candidate = typeof name === "function" ? nextCircleLabel(current.document.objects, name) : name
    if (typeof name === "function" && candidate === null) return false
    const label = PlanCircleInputSchema.shape.label.safeParse(candidate)
    if (!label.success || !closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "circle")) return false
    const id = crypto.randomUUID()
    client.setQueryData<CircleEditor>(draftKey, (): CircleEditor => ({ kind: "circle-create", baseRevision: current.revision, id, label: label.data ?? null, placement: { step: "center" } }))
    client.setQueryData(selectionKey, id)
    return true
  }
  function beginExisting(id: string, kind: "circle-update" | "circle-delete", expectedRevision?: number): boolean {
    const current = editableNow()
    const active = currentEditor()
    if (!current || (expectedRevision !== undefined && current.revision !== expectedRevision)) return false
    const target = circleObject(current, id)
    if (!target || target.locked) return false
    if (active?.kind === kind && active.id.toLowerCase() === id.toLowerCase()) return active.baseRevision === current.revision
    if (active && circleEditorHasChanges(active, current)) return false
    const input: SaveCircleInput = kind === "circle-delete" ? { kind, id: target.id, baseRevision: current.revision }
      : { kind, id: target.id, baseRevision: current.revision, center: target.center, edge: target.edge }
    const command = circleCommandFromEditor(circleEditorFromCommand(input))
    if (!command || !closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "circle")) return false
    client.setQueryData(draftKey, circleEditorFromCommand(command))
    client.setQueryData(selectionKey, target.id)
    return true
  }
  function confirmDelete(id: string, baseRevision: number, expectedEditor: CircleEditor | null): CircleDeleteCommand | null {
    const current = editableNow()
    const active = currentEditor()
    if (!current || current.revision !== baseRevision || JSON.stringify(active) !== JSON.stringify(expectedEditor)
      || (active && (active.kind !== "circle-update" || active.id.toLowerCase() !== id.toLowerCase() || active.baseRevision !== baseRevision))) return null
    const target = circleObject(current, id)
    if (!target || target.locked || !closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "circle")) return null
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    if (receipt && receipt.phase !== "idle" && receipt.phase !== "saved") {
      if (receipt.phase !== "error" || !isCircleCommand(receipt.edit) || receipt.edit.id.toLowerCase() !== target.id.toLowerCase()
        || !discardPlanEditSave(client, identity, receipt.edit)) return null
    }
    const command: CircleDeleteCommand = { kind: "circle-delete", id: target.id.toLowerCase(), baseRevision }
    client.setQueryData<CircleEditor>(draftKey, { ...command })
    client.setQueryData(selectionKey, target.id)
    return command
  }
  function open(name: (index: number) => string): "create" | "edit" | "select" | null {
    const current = editableNow()
    if (!current) return null
    const active = currentEditor()
    if (active) return active.kind === "circle-create" ? "create" : active.kind === "circle-update" ? "edit" : null
    const visible = current.document.objects.filter(object => object.type === "CIRCLE").filter(object => object.visible !== false)
    if (!visible.length) return beginCreate(name) ? "create" : null
    if (visible.length === 1) {
      const target = visible[0]
      if (target.locked || !circleHasValidRadius(target)) return select(target.id) ? "select" : null
      return beginExisting(target.id, "circle-update") ? "edit" : null
    }
    const selected = client.getQueryData<string | null>(selectionKey)
    return select(selected && circleObject(current, selected) ? selected : null) ? "select" : null
  }
  function beginNew(name: (index: number) => string): boolean {
    const current = editableNow()
    const active = currentEditor()
    if (!current || current.document.objects.length >= 500 || (active && circleEditorHasChanges(active, current))) return false
    return closeCleanEditor() && beginCreate(name)
  }
  function update(expectedId: string, change: (current: CircleEditor) => CircleEditor | null): boolean {
    const current = editableNow()
    const active = currentEditor()
    if (!current || !active || active.id.toLowerCase() !== expectedId.toLowerCase() || active.baseRevision !== current.revision) return false
    if (active.kind !== "circle-create") {
      const target = circleObject(current, active.id)
      if (!target || target.locked) return false
    }
    const next = change(active)
    if (!next) return false
    client.setQueryData(draftKey, next)
    return true
  }
  function command(expectedDeletion?: CircleDeleteCommand): SaveCircleInput | null {
    const current = editableNow()
    const active = currentEditor()
    if (!current || !active || (expectedDeletion ? expectedDeletion.kind !== "circle-delete" || !circleEditorMatchesCommand(active, expectedDeletion)
      : JSON.stringify(active) !== JSON.stringify(editor))
      || active.baseRevision !== current.revision || !circleEditorHasChanges(active, current)) return null
    if (active.kind !== "circle-create") {
      const target = circleObject(current, active.id)
      if (!target || target.locked) return null
    }
    return circleCommandFromEditor(active)
  }
  function closeCleanEditor(): boolean {
    if (!live()) return false
    const active = currentEditor()
    const current = client.getQueryData<ImagePlan>(planKey)
    if (!active) return true
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const recovering = receipt && isCircleCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved"
    if (recovering || submitting.current || isImagePlanSaveInFlight(client, identity) || circleEditorHasChanges(active, current)) return false
    client.setQueryData(draftKey, null)
    return true
  }
  function discard(): boolean {
    if (!live() || submitting.current || isImagePlanSaveInFlight(client, identity) || isCalibrationSaveLocked(client, image.caseId, image.id)) return false
    const active = currentEditor()
    if (JSON.stringify(active) !== JSON.stringify(editor)) return false
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const own = receipt && isCircleCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved" ? receipt.edit : null
    if (own && !discardPlanEditSave(client, identity, own)) return false
    if (!active) return true
    client.setQueryData(draftKey, null)
    const current = client.getQueryData<ImagePlan>(planKey)
    client.setQueryData(selectionKey, current && circleObject(current, active.id) ? active.id : null)
    return true
  }
  async function submit(expectedDeletion?: CircleDeleteCommand): Promise<ImagePlanSaveState | null> {
    if (!live() || submitting.current) return null
    const input = command(expectedDeletion)
    if (!input) return null
    submitting.current = true
    try {
      const result = await save.mutateAsync(input)
      return live() ? result : { phase: "error", code: "CLINICAL_CONTEXT_CHANGED" }
    } finally { submitting.current = false }
  }
  async function checkSave() {
    if (!live()) return
    const result = await captured.check()
    return live() ? result : { phase: "error" as const, code: "CLINICAL_CONTEXT_CHANGED" }
  }
  function refreshRead() {
    if (!live() || !canRetryRead || submitting.current || isCalibrationSaveLocked(client, image.caseId, image.id)
      || isImagePlanSaveInFlight(client, identity) || hasOtherImagePlanDraft(client, image.caseId, image.id, "circle")
      || client.getQueryState(planKey)?.fetchStatus === "fetching") return
    return planQuery.refetch()
  }
  function placeCentered(expectedId: string, step: CirclePlacementStep): boolean {
    if (!image.widthPx || !image.heightPx) return false
    const geometry = centeredCircleGeometry({ widthPx: image.widthPx, heightPx: image.heightPx })
    return Boolean(geometry && update(expectedId, editor => editor.kind === "circle-create" && editor.placement.step === step
      ? changeCircleGeometry(editor, geometry) : null))
  }
  function nudge(target: CircleAdjustmentTarget, event: { key: string; shiftKey: boolean; altKey: boolean }, mirrored: boolean, expectedId: string): boolean {
    if (!image.widthPx || !image.heightPx) return false
    const dimensions = { widthPx: image.widthPx, heightPx: image.heightPx }
    return update(expectedId, editor => {
      const geometry = circleEditorGeometry(editor)
      if (!geometry) return null
      const next = circleFromKeyboard(circleInPixels(geometry, dimensions), target, event, dimensions, mirrored)
      return next ? changeCircleGeometry(editor, circleInNormalized(next, dimensions, geometry)) : null
    })
  }

  return { planQuery, plan, editor, selectedId, contextGeneration: generation, geometry: editor ? circleEditorGeometry(editor) : null,
    placement: editor?.kind === "circle-create" ? editor.placement : null,
    receipt: captured.receipt, recovery: { ...captured, check: checkSave, discard }, hasChanges, needsRebase, canEdit, canSelect, canSave, canRetryRead,
    canCreate: canEdit && !editor && Boolean(plan && plan.document.objects.length < 500), locked, deleting, otherIntent, issue,
    select, open, beginCreate, beginNew, beginUpdate: (id: string) => beginExisting(id, "circle-update"),
    beginDelete: (id: string, revision?: number) => beginExisting(id, "circle-delete", revision), confirmDelete,
    changeGeometry: (geometry: CircleGeometry, expectedId: string) => update(expectedId, editor => changeCircleGeometry(editor, geometry)),
    placePoint: (point: ImagePoint, expectedId: string, step: CirclePlacementStep) => update(expectedId, editor =>
      editor.kind === "circle-create" && editor.placement.step === step ? placeCirclePoint(editor, point) : null),
    placeCentered, command, closeCleanEditor, discard, save, submit, refreshRead, nudge }
}

export { useImageCircle }
export type { CircleDeleteCommand }
export type ImageCircleState = ReturnType<typeof useImageCircle>
