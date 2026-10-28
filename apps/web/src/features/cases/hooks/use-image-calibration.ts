"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { calibrationFromEditor, calibrationGeometryIssue, changeEditorMarkerKind, convertReferenceUnit, defaultReferenceMarker, editorFromCalibration, editorFromPlan,
  editorHasChanges, geometryToMarker, markerToGeometry, type CalibrationEditor } from "../lib/calibration-editor"
import { IDLE_CALIBRATION_SAVE, isCalibrationSaveLocked, type CalibrationSaveState } from "../lib/calibration-save-state"
import { calibrationProductState } from "../lib/calibration-product-state"
import { IDLE_DELETION, isImageDeletionLocked, type ImageDeletionState } from "../lib/image-deletion"
import { imagePlanQueryOptions } from "../lib/image-plan-query-options"
import { hasQualityDraft } from "../lib/image-quality-draft"
import { requestCalibrationSave } from "../lib/image-plan-saving"
import type { SaveCalibrationInput } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import type { CalibrationMarker } from "../types/case-workspace"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useCalibrationDraft } from "./use-calibration-draft"

function useImageCalibration(image: CaseImage, ready: boolean, caseLocked: boolean) {
  const client = useQueryClient()
  const draftKey = keys.imageCalibrationDraft(image.caseId, image.id)
  const draft = useCalibrationDraft(image.caseId, image.id)
  const identity = { caseId: image.caseId, imageId: image.id }
  const planReceipt = useQuery<CalibrationSaveState>({ queryKey: keys.imagePlanSave(image.caseId, image.id), queryFn: async () => IDLE_CALIBRATION_SAVE,
    enabled: false, initialData: IDLE_CALIBRATION_SAVE, gcTime: Infinity }).data
  // Share the lock while keeping another feature's recovery controls out of
  // the calibration panel. Its command can only be checked in its own panel.
  const receipt = planReceipt.edit ? IDLE_CALIBRATION_SAVE : planReceipt
  const deletion = useQuery<ImageDeletionState>({ queryKey: keys.imageDeletion(image.caseId, image.id), queryFn: async () => IDLE_DELETION,
    enabled: false, initialData: IDLE_DELETION, gcTime: Infinity }).data
  const save = useMutation({ mutationFn: (command: { input: SaveCalibrationInput; checkOnly?: boolean }) =>
    requestCalibrationSave(client, identity, command.input, { checkOnly: command.checkOnly }), retry: false })
  const locked = save.isPending || ["saving", "checking", "uncertain"].includes(planReceipt.phase)
  const deleting = caseLocked || ["deleting", "checking", "uncertain", "deleted"].includes(deletion.phase)
  const recovery = receipt.phase !== "idle" && receipt.phase !== "saved" && receipt.draft
    ? editorFromCalibration(receipt.draft.baseRevision, receipt.draft.calibration) : null
  const planQuery = useQuery(imagePlanQueryOptions(client, identity, { enabled: image.status === "READY" && !deleting }))
  const plan = planQuery.data
  const editor = draft ?? recovery ?? (plan ? editorFromPlan(plan) : null)
  const dimensions = image.widthPx && image.heightPx ? { widthPx: image.widthPx, heightPx: image.heightPx } : null
  const issue = calibrationGeometryIssue(image)
  const otherIntent = hasQualityDraft(client, image.caseId, image.id)
  const interactionAvailable = image.status === "READY" && ready && !issue && !deleting && !locked && !otherIntent && !planQuery.isFetching
  const canEdit = interactionAvailable && Boolean(plan) && !planQuery.isError
  const canRetryRead = interactionAvailable && planQuery.isError
  const hasChanges = Boolean(editor && (plan ? editorHasChanges(editor, plan) : draft || recovery))
  const input = editor && calibrationFromEditor(editor)
  const needsRebase = Boolean(editor && plan && editor.baseRevision !== plan.revision)
  const canSave = canEdit && hasChanges && Boolean(input) && !needsRebase
  const product = calibrationProductState({ plan, imageId: image.id, receipt: planReceipt, dirty: hasChanges, needsRebase,
    pending: planQuery.isPending, readError: planQuery.isError, available: image.status === "READY" && ready && !issue && !deleting && !otherIntent })

  function update(change: (current: CalibrationEditor) => CalibrationEditor) {
    if (canEdit && editor && !isImageDeletionLocked(client, image.caseId, image.id) && !hasQualityDraft(client, image.caseId, image.id)) {
      client.setQueryData<CalibrationEditor | null>(draftKey, current => change(current ?? editor))
    }
  }
  function changeMarker(marker: CalibrationMarker) {
    if (dimensions) update(current => ({ ...current, kind: marker.kind, geometry: markerToGeometry(marker, dimensions, current.geometry) }))
  }
  function discard() {
    if (locked || isCalibrationSaveLocked(client, image.caseId, image.id)) return false
    // The calibration editor cannot discard another feature's unresolved intent.
    const currentReceipt = client.getQueryData<CalibrationSaveState>(keys.imagePlanSave(image.caseId, image.id))
    if (currentReceipt?.edit && currentReceipt.phase !== "saved" && currentReceipt.phase !== "idle") return false
    const mustReload = receipt.phase === "conflict" && (!receipt.currentRevision || !plan || plan.revision < receipt.currentRevision)
    client.setQueryData(draftKey, null)
    client.setQueryData(keys.imagePlanSave(image.caseId, image.id), IDLE_CALIBRATION_SAVE)
    if (mustReload) void client.resetQueries({ queryKey: keys.imagePlan(image.caseId, image.id), exact: true })
    return true
  }
  function command(): SaveCalibrationInput | null { return canSave && editor && input ? { baseRevision: editor.baseRevision, calibration: input } : null }
  const marker = dimensions && editor ? geometryToMarker(editor.geometry, dimensions) : null

  return { planQuery, plan, receipt, planReceipt, editor, issue, canEdit, canRetryRead, canSave, hasChanges, locked, deleting, needsRebase, marker, save, command, discard, otherIntent,
    ...product,
    changeMarker, changeKind: (kind: CalibrationMarker["kind"]) => { if (dimensions) update(current => changeEditorMarkerKind(current, kind, dimensions)) },
    changeReference: (reference: string) => update(current => ({ ...current, reference })),
    changeUnit: (unit: CalibrationEditor["unit"]) => update(current => ({ ...current, unit, reference: convertReferenceUnit(current.reference, current.unit, unit) })),
    placeMarker: () => { if (dimensions) update(current => ({ ...current,
      geometry: markerToGeometry(defaultReferenceMarker(current.kind, dimensions), dimensions, current.geometry) })) },
    initializeMarker: () => {
      if (dimensions && !plan?.document.calibration) update(current =>
        current.geometry || current.reference.trim() || current.kind !== "line" ? current : {
          ...current, geometry: markerToGeometry(defaultReferenceMarker("line", dimensions), dimensions),
        })
    },
    check: () => { if (!deleting && receipt.phase === "uncertain" && receipt.draft) save.mutate({ input: receipt.draft, checkOnly: true }) },
    refresh: () => { if (!locked && !deleting) void planQuery.refetch() },
  }
}

export { useImageCalibration }
export type ImageCalibrationState = ReturnType<typeof useImageCalibration>
