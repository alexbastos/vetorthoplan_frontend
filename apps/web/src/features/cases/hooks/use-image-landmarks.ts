"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { calibrationGeometryIssue } from "../lib/calibration-editor"
import { isCalibrationSaveLocked, isPlanImageDeleted, type ImagePlanSaveState } from "../lib/calibration-save-state"
import { isCaseDeletionLocked } from "../lib/case-deletion"
import { IDLE_DELETION, type ImageDeletionState } from "../lib/image-deletion"
import { closeOtherCleanMeasurementEditor, hasOtherImagePlanDraft } from "../lib/image-plan-draft"
import { imagePlanQueryOptions } from "../lib/image-plan-query-options"
import { discardPlanEditSave, isImagePlanSaveInFlight, requestPlanEditSave } from "../lib/image-plan-saving"
import { changeLandmarksGeometry, landmarksGeometryFromEditor, changeLandmarksPoint, LANDMARK_POINT_NAMES, landmarksCommandFromEditor,
  landmarksEditorFromCommand, landmarksEditorFromPlan, landmarksEditorHasChanges, landmarksEditorMatchesCommand, placeLandmarksPoint, selectLandmarksPoint,
  type LandmarksEditor, type LandmarksPointName } from "../lib/landmarks-editor"
import { isLandmarksCommand, type SaveLandmarksInput } from "../schemas/image-plan-command.schema"
import { landmarksMatches, type ImagePlan, type TploLandmarksInput } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import type { ImagePoint } from "../types/case-workspace"
import { landmarksInNormalized, landmarksInPixels, type LandmarksGeometry } from "../lib/landmarks-geometry"
import { landmarksFromKeyboard, type LandmarksAdjustmentTarget } from "../lib/landmarks-interaction"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useOtherImagePlanDraft } from "./use-image-plan-drafts"
import { useLandmarksSaveRecovery } from "./use-landmarks-save-recovery"
import { useWorkspaceDraft } from "./use-workspace-draft"

type LandmarksClearCommand = Extract<SaveLandmarksInput, { kind: "landmarks-clear" }>

function geometryContextOf(image: CaseImage): string {
  return JSON.stringify([image.widthPx, image.heightPx, image.kind, image.pixelSpacingMm, image.imagerPixelSpacingMm])
}

function useImageLandmarks(image: CaseImage, ready: boolean, caseLocked: boolean, options: {
  active: boolean; toolActive: boolean; calibrationEditing: boolean
}) {
  const client = useQueryClient()
  const identity = { caseId: image.caseId, imageId: image.id }
  const draftKey = keys.imageLandmarksDraft(image.caseId, image.id), planKey = keys.imagePlan(image.caseId, image.id)
  const draft = useWorkspaceDraft<LandmarksEditor>("image-landmarks-draft", image.caseId, image.id)
  const draftQuery = client.getQueryCache().find({ queryKey: draftKey, exact: true })
  const available = ready && image.status === "READY" && !caseLocked && !options.calibrationEditing
  const geometryContext = geometryContextOf(image)
  const scope = useRef({ client, ...identity, draftQuery, available, active: options.active, toolActive: options.toolActive, geometryContext, generation: 0 })
  if (scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id
    || scope.current.draftQuery !== draftQuery || scope.current.available !== available || scope.current.active !== options.active
    || scope.current.toolActive !== options.toolActive || scope.current.geometryContext !== geometryContext) {
    scope.current = { client, ...identity, draftQuery, available, active: options.active, toolActive: options.toolActive, geometryContext,
      generation: scope.current.generation + 1 }
  }
  const generation = scope.current.generation
  const mounted = useRef(false), submitting = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const captured = useLandmarksSaveRecovery(image, caseLocked)
  const deletion = useQuery<ImageDeletionState>({ queryKey: keys.imageDeletion(image.caseId, image.id), queryFn: async () => IDLE_DELETION,
    enabled: false, initialData: IDLE_DELETION, gcTime: Infinity }).data
  const deleting = caseLocked || ["deleting", "checking", "uncertain", "deleted"].includes(deletion.phase)
  const planQuery = useQuery(imagePlanQueryOptions(client, identity, { enabled: options.active && image.status === "READY" && !deleting }))
  const plan = planQuery.data
  const otherIntent = useOtherImagePlanDraft(image.caseId, image.id, "landmarks")
  const editor = draft ?? (captured.active && captured.command ? landmarksEditorFromCommand(captured.command) : null)
  const issue = calibrationGeometryIssue(image)
  const save = useMutation({ mutationFn: (input: SaveLandmarksInput) => requestPlanEditSave(client, identity, input), retry: false })
  const locked = save.isPending || captured.pending || isCalibrationSaveLocked(client, image.caseId, image.id)
  const hasChanges = Boolean(editor && landmarksEditorHasChanges(editor, plan))
  const needsRebase = Boolean(editor && plan && editor.baseRevision !== plan.revision)
  const canAccess = options.active && available && !deleting && !locked && !otherIntent
    && Boolean(plan && plan.imageId.toLowerCase() === image.id.toLowerCase()) && !planQuery.isFetching && !planQuery.isError
  const canOpen = canAccess && !issue && captured.receipt.phase !== "conflict"
  const canSelect = canAccess && !captured.active
  const canClear = canSelect && options.toolActive && !needsRebase && Boolean(plan?.document.tplo_landmarks)
    && editor?.kind !== "landmarks-clear"
  const canEdit = canOpen && options.toolActive && !needsRebase && captured.receipt.phase !== "conflict" && editor?.kind !== "landmarks-clear"
  const input = editor && landmarksCommandFromEditor(editor)
  const geometry = editor ? landmarksGeometryFromEditor(editor) : null
  const canSave = canAccess && options.toolActive && !needsRebase && captured.receipt.phase !== "conflict" && hasChanges
    && Boolean(input && (input.kind === "landmarks-clear" || !issue))
  const canRetryRead = options.active && available && !deleting && !locked && !otherIntent && !planQuery.isFetching

  function live() {
    return mounted.current && !caseLocked && scope.current.generation === generation && scope.current.client === client
      && scope.current.caseId === image.caseId && scope.current.imageId === image.id
      && Boolean(draftQuery && scope.current.draftQuery === draftQuery && client.getQueryCache().find({ queryKey: draftKey, exact: true }) === draftQuery)
      && !isPlanImageDeleted(client, identity) && !isCaseDeletionLocked(client, image.caseId)
      && !["deleting", "checking", "uncertain", "deleted"].includes(client.getQueryData<ImageDeletionState>(keys.imageDeletion(image.caseId, image.id))?.phase ?? "idle")
  }
  function currentEditor(): LandmarksEditor | null {
    const stored = client.getQueryData<LandmarksEditor | null>(draftKey)
    if (stored) return stored
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    return receipt && isLandmarksCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved"
      ? landmarksEditorFromCommand(receipt.edit) : null
  }
  function editableNow(requireGeometry = true): ImagePlan | null {
    const current = client.getQueryData<ImagePlan>(planKey)
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const cachedImage = client.getQueryData<CaseImage[]>(keys.images(image.caseId))?.find(item => item.id === image.id)
    return live() && canAccess && !submitting.current && current && current.revision === plan?.revision
      && current.imageId.toLowerCase() === image.id.toLowerCase()
      && (!requireGeometry || !issue && (!cachedImage || !calibrationGeometryIssue(cachedImage) && geometryContextOf(cachedImage) === geometryContext))
      && (!cachedImage || cachedImage.status === "READY")
      && !isImagePlanSaveInFlight(client, identity) && !isCalibrationSaveLocked(client, image.caseId, image.id)
      && !hasOtherImagePlanDraft(client, image.caseId, image.id, "landmarks")
      && receipt?.phase !== "conflict"
      && client.getQueryState(planKey)?.fetchStatus !== "fetching" && client.getQueryState(planKey)?.status !== "error" ? current : null
  }

  // Reopening resumes the one local intent or edits the saved set. Entry alone
  // never writes, rebases a stale draft, or derives points from calibration.
  function open({ newOnly = false }: { newOnly?: boolean } = {}): boolean {
    const current = editableNow()
    if (!current) return false
    const active = currentEditor()
    if (newOnly && (active || current.document.tplo_landmarks)) return false
    if (!closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "landmarks")) return false
    if (active) return true
    scope.current.generation += 1
    client.setQueryData(draftKey, landmarksEditorFromPlan(current))
    return true
  }
  function selectSaved(): boolean {
    const current = editableNow(false)
    return Boolean(canSelect && current?.document.tplo_landmarks
      && closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "landmarks"))
  }
  function confirmClear(baseRevision: number, expectedEditor: LandmarksEditor | null, expectedLandmarks: TploLandmarksInput): LandmarksClearCommand | null {
    const current = editableNow(false), active = currentEditor()
    if (!canClear || !options.toolActive || !current || current.revision !== baseRevision
      || JSON.stringify(active) !== JSON.stringify(expectedEditor)
      || active && (active.kind !== "landmarks-set" || active.baseRevision !== baseRevision)
      || !landmarksMatches(current.document.tplo_landmarks, expectedLandmarks)) return null
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    if (receipt && receipt.phase !== "idle" && receipt.phase !== "saved"
      || !closeOtherCleanMeasurementEditor(client, image.caseId, image.id, "landmarks")) return null
    const command: LandmarksClearCommand = { kind: "landmarks-clear", baseRevision }
    // This synchronous transition is submitted using the exact confirmed token.
    // Ordinary edit submission still requires its rendered editor snapshot.
    client.setQueryData<LandmarksEditor>(draftKey, { ...command })
    return command
  }
  function update(change: (current: LandmarksEditor) => LandmarksEditor | null): boolean {
    const current = editableNow(), active = currentEditor()
    if (!canEdit || !options.toolActive || !current || !active || active.kind !== "landmarks-set" || active.baseRevision !== current.revision
      || JSON.stringify(active) !== JSON.stringify(editor)) return false
    const next = change(active)
    if (!next) return false
    // Every explicit selection/placement invalidates callbacks from the previous
    // step, including A -> B -> A selection and a repeated final-point event.
    scope.current.generation += 1
    client.setQueryData(draftKey, next)
    return true
  }
  function selectPoint(point: LandmarksPointName): boolean {
    return update(active => selectLandmarksPoint(active, point))
  }
  function placePoint(point: ImagePoint, expectedPoint: LandmarksPointName): boolean {
    return update(active => placeLandmarksPoint(active, expectedPoint, point))
  }
  function changePoint(name: LandmarksPointName, point: ImagePoint): boolean {
    return update(active => changeLandmarksPoint(active, name, point))
  }
  function changeGeometry(value: LandmarksGeometry): boolean {
    return update(active => changeLandmarksGeometry(active, value))
  }
  function nudge(target: LandmarksAdjustmentTarget, event: { key: string; shiftKey: boolean; altKey: boolean }, mirrored: boolean): boolean {
    return update(active => {
      const geometry = landmarksGeometryFromEditor(active)
      if (!geometry || !image.widthPx || !image.heightPx) return null
      const dimensions = { widthPx: image.widthPx, heightPx: image.heightPx }
      const next = landmarksFromKeyboard(landmarksInPixels(geometry, dimensions), target, event, dimensions, mirrored)
      return next ? changeLandmarksGeometry(active, landmarksInNormalized(next, dimensions, geometry)) : null
    })
  }
  function command(expectedDeletion?: LandmarksClearCommand): SaveLandmarksInput | null {
    const active = currentEditor(), current = editableNow(active?.kind !== "landmarks-clear")
    if (!options.toolActive || !current || !active || (expectedDeletion ? expectedDeletion.kind !== "landmarks-clear"
      || !landmarksEditorMatchesCommand(active, expectedDeletion) : JSON.stringify(active) !== JSON.stringify(editor))
      || active.baseRevision !== current.revision || !landmarksEditorHasChanges(active, current)) return null
    return landmarksCommandFromEditor(active)
  }
  function closeCleanEditor(): boolean {
    if (!live()) return false
    const active = currentEditor(), current = client.getQueryData<ImagePlan>(planKey)
    if (!active) return true
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    if (receipt && isLandmarksCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved"
      || submitting.current || isImagePlanSaveInFlight(client, identity) || isCalibrationSaveLocked(client, image.caseId, image.id)
      || landmarksEditorHasChanges(active, current)) return false
    scope.current.generation += 1
    client.setQueryData(draftKey, null)
    return true
  }
  function discard(): boolean {
    if (!live() || submitting.current || isImagePlanSaveInFlight(client, identity) || isCalibrationSaveLocked(client, image.caseId, image.id)) return false
    const active = currentEditor()
    if (JSON.stringify(active) !== JSON.stringify(editor)) return false
    const receipt = client.getQueryData<ImagePlanSaveState>(keys.imagePlanSave(image.caseId, image.id))
    const own = receipt && isLandmarksCommand(receipt.edit) && receipt.phase !== "idle" && receipt.phase !== "saved" ? receipt.edit : null
    if (own && (!captured.active || !captured.command
      || !landmarksEditorMatchesCommand(landmarksEditorFromCommand(captured.command), own)
      || !discardPlanEditSave(client, identity, own))) return false
    if (active) {
      scope.current.generation += 1
      client.setQueryData(draftKey, null)
    }
    return true
  }
  async function submit(expectedDeletion?: LandmarksClearCommand): Promise<ImagePlanSaveState | null> {
    if (!live() || submitting.current) return null
    const value = command(expectedDeletion)
    if (!value) return null
    submitting.current = true
    try {
      const result = await save.mutateAsync(value)
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
      || isImagePlanSaveInFlight(client, identity) || hasOtherImagePlanDraft(client, image.caseId, image.id, "landmarks")
      || client.getQueryState(planKey)?.fetchStatus === "fetching") return
    return planQuery.refetch()
  }

  return { planQuery, plan, editor, geometry, contextGeneration: generation, activePoint: editor?.kind === "landmarks-set" ? editor.activePoint : null,
    placement: editor?.kind === "landmarks-set" ? editor.landmarks : null,
    placedPoints: editor?.kind === "landmarks-set" ? LANDMARK_POINT_NAMES.filter(point => Boolean(editor.landmarks[point])) : [],
    complete: Boolean(input && input.kind === "landmarks-set"), receipt: captured.receipt, recovery: { ...captured, check: checkSave, discard },
    hasChanges, needsRebase, canOpen, canSelect, canClear, canEdit, canSave, canRetryRead, locked, deleting, otherIntent, issue,
    open, selectSaved, confirmClear, selectPoint, placePoint, changePoint, changeGeometry, nudge, command, closeCleanEditor, discard, save, submit, refreshRead }
}

export { useImageLandmarks }
export type ImageLandmarksState = ReturnType<typeof useImageLandmarks>
export type { LandmarksClearCommand }
