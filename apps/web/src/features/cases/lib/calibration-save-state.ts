import type { QueryClient } from "@tanstack/react-query"

import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import type { SaveCalibrationInput } from "../schemas/image-plan.schema"
import type { SavePlanEditInput } from "../schemas/image-plan-command.schema"

type PlanIdentity = { caseId: string; imageId: string }
type ImagePlanSaveState = {
  phase: "idle" | "checking" | "saving" | "saved" | "conflict" | "uncertain" | "error"
  draft?: SaveCalibrationInput
  edit?: SavePlanEditInput
  code?: string
  currentRevision?: number
}
// Compatibility name for the existing calibration UI. The receipt and its lock
// are shared by every permitted command, including radiographic quality.
type CalibrationSaveState = ImagePlanSaveState
const IDLE_CALIBRATION_SAVE: CalibrationSaveState = { phase: "idle" }

function isCalibrationSaveLocked(client: QueryClient, caseId: string, imageId: string): boolean {
  const phase = client.getQueryData<CalibrationSaveState>(keys.imagePlanSave(caseId, imageId))?.phase
  return phase === "checking" || phase === "saving" || phase === "uncertain"
}

function isPlanImageDeleted(client: QueryClient, { caseId, imageId }: PlanIdentity): boolean {
  return client.getQueryData<{ phase?: string }>(keys.caseDeletion(caseId))?.phase === "deleted"
    || client.getQueryData<{ phase?: string }>(keys.imageDeletion(caseId, imageId))?.phase === "deleted"
    || Boolean(client.getQueryData<string[]>(keys.deletedImages(caseId))?.includes(imageId))
}

export { IDLE_CALIBRATION_SAVE, isCalibrationSaveLocked, isPlanImageDeleted }
export type { CalibrationSaveState, ImagePlanSaveState, PlanIdentity }
