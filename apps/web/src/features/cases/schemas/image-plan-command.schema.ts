import { z } from "zod"

import { PlanDocumentSchema, SaveCalibrationSchema, calibrationMatches, type ImagePlan } from "./image-plan.schema"

// Commands grow with each feature. Never accept a full document or server-owned
// measurements, eligibility decisions, review identity or audit from the browser.
const SavePlanEditSchema = z.object({
  kind: z.literal("radiographic-quality"),
  baseRevision: SaveCalibrationSchema.shape.baseRevision,
  quality: PlanDocumentSchema.shape.radiographic_quality.unwrap().unwrap().extend({ notes: z.string().max(2000).nullable().default(null) }),
}).strict()
const PlanSaveCommandSchema = z.union([SaveCalibrationSchema, SavePlanEditSchema])
type SavePlanEditInput = z.infer<typeof SavePlanEditSchema>
type PlanSaveCommand = z.infer<typeof PlanSaveCommandSchema>

function planCommandMatches(plan: ImagePlan, command: PlanSaveCommand): boolean {
  if (!("kind" in command)) return calibrationMatches(plan.document.calibration, command.calibration)
    && (command.calibration === null || Boolean(plan.document.calibration?.result))
  const quality = SavePlanEditSchema.shape.quality.safeParse(plan.document.radiographic_quality)
  return quality.success && JSON.stringify(quality.data) === JSON.stringify(command.quality)
}

function applyPlanCommand(document: ImagePlan["document"], command: PlanSaveCommand): ImagePlan["document"] {
  return "kind" in command ? { ...document, radiographic_quality: command.quality }
    : { ...document, calibration: command.calibration }
}

export { PlanSaveCommandSchema, SavePlanEditSchema, applyPlanCommand, planCommandMatches }
export type { PlanSaveCommand, SavePlanEditInput }
