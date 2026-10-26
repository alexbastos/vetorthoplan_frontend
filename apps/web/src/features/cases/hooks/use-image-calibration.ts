"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { calibrationFromEditor, calibrationGeometryIssue, convertReferenceUnit, defaultReferenceMarker, editorFromCalibration, editorFromPlan,
  editorHasChanges, geometryToMarker, markerToGeometry, type CalibrationEditor } from "../lib/calibration-editor"
import { IDLE_CALIBRATION_SAVE, type CalibrationSaveState } from "../lib/calibration-save-state"
import { IDLE_DELETION, type ImageDeletionState } from "../lib/image-deletion"
import { imagePlanQueryOptions } from "../lib/image-plan-query-options"
import { requestCalibrationSave } from "../lib/image-plan-saving"
import { calibrationInputOf, type SaveCalibrationInput } from "../schemas/image-plan.schema"
import type { CaseImage } from "../types/case-image"
import type { CalibrationMarker } from "../types/case-workspace"
import { casesQueryKeys as keys } from "./cases-query-keys"

function useImageCalibration(image: CaseImage, ready: boolean, caseLocked: boolean) {
  const client = useQueryClient()
  const [draft, setDraft] = useState<CalibrationEditor | null>(null)
  const identity = { caseId: image.caseId, imageId: image.id }
  const receipt = useQuery<CalibrationSaveState>({ queryKey: keys.imagePlanSave(image.caseId, image.id), queryFn: async () => IDLE_CALIBRATION_SAVE,
    enabled: false, initialData: IDLE_CALIBRATION_SAVE, gcTime: Infinity }).data
  const deletion = useQuery<ImageDeletionState>({ queryKey: keys.imageDeletion(image.caseId, image.id), queryFn: async () => IDLE_DELETION,
    enabled: false, initialData: IDLE_DELETION, gcTime: Infinity }).data
  const save = useMutation({ mutationFn: (command: { input: SaveCalibrationInput; checkOnly?: boolean }) =>
    requestCalibrationSave(client, identity, command.input, { checkOnly: command.checkOnly }), retry: false,
    onSuccess: result => { if (result.phase === "saved") setDraft(null) } })
  const locked = save.isPending || ["saving", "checking", "uncertain"].includes(receipt.phase)
  const deleting = caseLocked || ["deleting", "checking", "uncertain", "deleted"].includes(deletion.phase)
  const recovery = receipt.phase !== "idle" && receipt.phase !== "saved" && receipt.draft
    ? editorFromCalibration(receipt.draft.baseRevision, receipt.draft.calibration) : null
  const planQuery = useQuery(imagePlanQueryOptions(client, identity, { enabled: image.status === "READY" && !deleting && !draft }))
  const plan = planQuery.data
  const editor = draft ?? recovery ?? (plan ? editorFromPlan(plan) : null)
  const dimensions = image.widthPx && image.heightPx ? { widthPx: image.widthPx, heightPx: image.heightPx } : null
  const issue = calibrationGeometryIssue(image)
  const canEdit = ready && !issue && !deleting && !locked && Boolean(plan) && !planQuery.isError
  const hasChanges = Boolean(editor && (plan ? editorHasChanges(editor, plan) : draft || recovery))
  const input = editor && calibrationFromEditor(editor)
  const needsRebase = Boolean(editor && plan && editor.baseRevision !== plan.revision)
  const canSave = canEdit && hasChanges && Boolean(input) && !needsRebase

  function update(change: (current: CalibrationEditor) => CalibrationEditor) {
    if (canEdit && editor) setDraft(current => change(current ?? editor))
  }
  function changeMarker(marker: CalibrationMarker) {
    if (dimensions) update(current => ({ ...current, kind: marker.kind, geometry: markerToGeometry(marker, dimensions, current.geometry) }))
  }
  function discard() {
    if (locked) return
    setDraft(null)
    client.setQueryData(keys.imagePlanSave(image.caseId, image.id), IDLE_CALIBRATION_SAVE)
  }
  function command(): SaveCalibrationInput | null { return canSave && editor && input ? { baseRevision: editor.baseRevision, calibration: input } : null }
  const savedGeometry = plan?.document.calibration ? calibrationInputOf(plan.document.calibration) : null
  const marker = dimensions && editor ? geometryToMarker(editor.geometry, dimensions) : null
  const savedMarker = dimensions ? geometryToMarker(savedGeometry, dimensions) : null

  return { planQuery, plan, receipt, editor, issue, canEdit, canSave, hasChanges, locked, deleting, needsRebase, marker, savedMarker, save, command, discard,
    changeMarker, changeKind: (kind: CalibrationMarker["kind"]) => update(current => ({ ...current, kind, geometry: current.kind === kind ? current.geometry : null })),
    changeReference: (reference: string) => update(current => ({ ...current, reference })),
    changeUnit: (unit: CalibrationEditor["unit"]) => update(current => ({ ...current, unit, reference: convertReferenceUnit(current.reference, current.unit, unit) })),
    placeMarker: () => { if (dimensions) update(current => ({ ...current,
      geometry: markerToGeometry(defaultReferenceMarker(current.kind, dimensions), dimensions, current.geometry) })) },
    check: () => { if (!deleting && receipt.phase === "uncertain" && receipt.draft) save.mutate({ input: receipt.draft, checkOnly: true }) },
    refresh: () => { if (!locked && !deleting) void planQuery.refetch() },
  }
}

export { useImageCalibration }
export type ImageCalibrationState = ReturnType<typeof useImageCalibration>
