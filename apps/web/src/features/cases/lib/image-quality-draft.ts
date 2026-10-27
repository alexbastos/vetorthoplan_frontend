import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { SavePlanEditSchema, type SavePlanEditInput } from "../schemas/image-plan-command.schema"
import type { ImagePlan } from "../schemas/image-plan.schema"
import { hasCalibrationDraft } from "./calibration-draft"
import type { ImagePlanSaveState } from "./calibration-save-state"

const qualityFields = ["true_lateral", "femoral_condyles_superimposed", "stifle_and_tarsus_included", "tibial_axis_centered", "tibial_plateau_visible"] as const
type ImageQuality = SavePlanEditInput["quality"]
type ImageQualityDraft = { baseRevision: number; quality: ImageQuality }

function qualityFromPlan(plan: ImagePlan): ImageQuality {
  return SavePlanEditSchema.shape.quality.parse(plan.document.radiographic_quality ?? {})
}
function qualityHasChanges(draft: ImageQualityDraft, plan: ImagePlan): boolean {
  return JSON.stringify(draft.quality) !== JSON.stringify(qualityFromPlan(plan))
}
function hasQualityDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return client.getQueryCache().findAll({ queryKey: ["cases", "image-quality-draft", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const draft = query.state.data as ImageQualityDraft | null | undefined
    if (!draft) return false
    const plan = client.getQueryData<ImagePlan>(keys.imagePlan(caseId, String(query.queryKey[3])))
    return !plan || qualityHasChanges(draft, plan)
  }) || client.getQueryCache().findAll({ queryKey: ["cases", "image-plan-save", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const receipt = query.state.data as ImagePlanSaveState | undefined
    return Boolean(receipt?.edit && receipt.phase !== "saved" && receipt.phase !== "idle")
  })
}
function hasImagePlanDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return hasCalibrationDraft(client, caseId, imageId) || hasQualityDraft(client, caseId, imageId)
}

export { hasImagePlanDraft, hasQualityDraft, qualityFields, qualityFromPlan, qualityHasChanges }
export type { ImageQuality, ImageQualityDraft }
