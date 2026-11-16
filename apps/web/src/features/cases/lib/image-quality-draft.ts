import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { SaveRadiographicQualitySchema, type SaveRadiographicQualityInput } from "../schemas/image-plan-command.schema"
import type { ImagePlan } from "../schemas/image-plan.schema"

const qualityFields = ["true_lateral", "femoral_condyles_superimposed", "stifle_and_tarsus_included", "tibial_axis_centered", "tibial_plateau_visible"] as const
type ImageQuality = SaveRadiographicQualityInput["quality"]
type ImageQualityDraft = { baseRevision: number; quality: ImageQuality }

function qualityFromPlan(plan: ImagePlan): ImageQuality {
  return SaveRadiographicQualitySchema.shape.quality.parse(plan.document.radiographic_quality ?? {})
}
function qualityHasChanges(draft: ImageQualityDraft, plan: ImagePlan): boolean {
  return JSON.stringify(draft.quality) !== JSON.stringify(qualityFromPlan(plan))
}
function hasRawQualityDraft(client: QueryClient, caseId: string, imageId?: string): boolean {
  return client.getQueryCache().findAll({ queryKey: ["cases", "image-quality-draft", caseId] }).some(query => {
    if (imageId && query.queryKey[3] !== imageId) return false
    const draft = query.state.data as ImageQualityDraft | null | undefined
    if (!draft) return false
    const plan = client.getQueryData<ImagePlan>(keys.imagePlan(caseId, String(query.queryKey[3])))
    return !plan || qualityHasChanges(draft, plan)
  })
}
export { hasRawQualityDraft, qualityFields, qualityFromPlan, qualityHasChanges }
export type { ImageQuality, ImageQualityDraft }
