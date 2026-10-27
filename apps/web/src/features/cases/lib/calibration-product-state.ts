import type { CalibrationSaveState } from "./calibration-save-state"
import type { ImagePlan } from "../schemas/image-plan.schema"

type CalibrationProductState = "loading" | "unavailable" | "uncalibrated" | "editing" | "saving" | "checking" | "saved" | "conflict" | "uncertain" | "error"

function calibrationProductState({ plan, imageId, receipt, dirty, needsRebase, pending, readError, available }: {
  plan?: ImagePlan; imageId: string; receipt: CalibrationSaveState; dirty: boolean; needsRebase: boolean;
  pending: boolean; readError: boolean; available: boolean
}): { state: CalibrationProductState; measurementEligible: boolean } {
  let state: CalibrationProductState
  if (receipt.phase === "saving" || receipt.phase === "checking" || receipt.phase === "uncertain") state = receipt.phase
  else if (receipt.phase === "conflict" || needsRebase) state = "conflict"
  else if (receipt.phase === "error" || readError) state = "error"
  else if (!available) state = "unavailable"
  else if (pending) state = "loading"
  else if (!plan || plan.imageId !== imageId) state = "error"
  else if (dirty) state = "editing"
  else state = plan.revision > 0 && plan.document.calibration?.result ? "saved" : "uncalibrated"
  return { state, measurementEligible: state === "saved" }
}

export { calibrationProductState }
export type { CalibrationProductState }
