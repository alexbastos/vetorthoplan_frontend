import type { QueryClient } from "@tanstack/react-query"

import { imagePlanSaveOwner, type ImagePlanSaveState } from "./calibration-save-state"
import { hasCalibrationDraft } from "./calibration-draft"
import { hasDistanceDraft } from "./distance-draft"
import { hasAngleDraft } from "./angle-draft"
import { hasCircleDraft } from "./circle-draft"
import { hasLandmarksDraft } from "./landmarks-draft"
import { hasTploDraft, tploDraftHasChanges, type TploDraft } from "./tplo-draft"
import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { angleEditorHasChanges, type AngleEditor } from "./angle-editor"
import { distanceEditorHasChanges, type DistanceEditor } from "./distance-editor"
import { circleEditorHasChanges, type CircleEditor } from "./circle-editor"
import { landmarksEditorHasChanges, type LandmarksEditor } from "./landmarks-editor"
import { hasRawQualityDraft } from "./image-quality-draft"
import type { PlanCommandOwner } from "../schemas/image-plan-command.schema"

type PlanDraftOwner = PlanCommandOwner

function hasPlanDraft(client: QueryClient, caseId: string, imageId?: string, excluding?: PlanDraftOwner): boolean {
  if (excluding !== "calibration" && hasCalibrationDraft(client, caseId, imageId)) return true
  if (excluding !== "radiographic-quality" && hasRawQualityDraft(client, caseId, imageId)) return true
  if (excluding !== "distance" && hasDistanceDraft(client, caseId, imageId)) return true
  if (excluding !== "angle" && hasAngleDraft(client, caseId, imageId)) return true
  if (excluding !== "circle" && hasCircleDraft(client, caseId, imageId)) return true
  if (excluding !== "landmarks" && hasLandmarksDraft(client, caseId, imageId)) return true
  if (excluding !== "tplo" && hasTploDraft(client, caseId, imageId)) return true
  return client.getQueryCache().findAll({ queryKey: ["cases", "image-plan-save", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const receipt = query.state.data as ImagePlanSaveState | undefined
    if (!receipt || receipt.phase === "idle" || receipt.phase === "saved") return false
    const owner = imagePlanSaveOwner(receipt)
    return owner !== null && owner !== excluding
  })
}

function hasImagePlanDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return hasPlanDraft(client, caseId, imageId)
}

function hasOtherImagePlanDraft(client: QueryClient, caseId: string, imageId: string, owner: PlanDraftOwner): boolean {
  return hasPlanDraft(client, caseId, imageId, owner)
}

// Closing a clean editor is a tool transition, not an explicit discard of user
// changes. Selection and the confirmed plan stay untouched.
function closeOtherCleanMeasurementEditor(client: QueryClient, caseId: string, imageId: string, owner: "distance" | "angle" | "circle" | "landmarks" | "tplo"): boolean {
  if (hasOtherImagePlanDraft(client, caseId, imageId, owner)) return false
  const plan = client.getQueryData<ImagePlan>(keys.imagePlan(caseId, imageId))
  if (owner !== "distance") {
    const key = keys.imageDistanceDraft(caseId, imageId)
    const editor = client.getQueryData<DistanceEditor | null>(key)
    if (editor) {
      if (distanceEditorHasChanges(editor, plan)) return false
      client.setQueryData(key, null)
    }
  }
  if (owner !== "angle") {
    const key = keys.imageAngleDraft(caseId, imageId)
    const editor = client.getQueryData<AngleEditor | null>(key)
    if (editor) {
      if (angleEditorHasChanges(editor, plan)) return false
      client.setQueryData(key, null)
    }
  }
  if (owner !== "circle") {
    const key = keys.imageCircleDraft(caseId, imageId)
    const editor = client.getQueryData<CircleEditor | null>(key)
    if (editor) {
      if (circleEditorHasChanges(editor, plan)) return false
      client.setQueryData(key, null)
    }
  }
  if (owner !== "landmarks") {
    const key = keys.imageLandmarksDraft(caseId, imageId)
    const editor = client.getQueryData<LandmarksEditor | null>(key)
    if (editor) {
      if (landmarksEditorHasChanges(editor, plan)) return false
      client.setQueryData(key, null)
    }
  }
  if (owner !== "tplo") {
    const key = keys.imageTploDraft(caseId, imageId)
    const draft = client.getQueryData<TploDraft | null>(key)
    if (draft) {
      if (tploDraftHasChanges(draft, plan)) return false
      client.setQueryData(key, null)
    }
  }
  return true
}

export { hasImagePlanDraft, hasOtherImagePlanDraft, closeOtherCleanMeasurementEditor }
export type { PlanDraftOwner }
