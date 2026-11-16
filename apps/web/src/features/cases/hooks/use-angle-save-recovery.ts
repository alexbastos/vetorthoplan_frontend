"use client"

import { isAngleCommand } from "../schemas/image-plan-command.schema"
import type { CaseImage } from "../types/case-image"
import { useMeasurementSaveRecovery } from "./use-measurement-save-recovery"

const angleRecovery = { family: "angle", isCommand: isAngleCommand } as const

function useAngleSaveRecovery(image: CaseImage, caseLocked: boolean) {
  return useMeasurementSaveRecovery(image, caseLocked, angleRecovery)
}

export { useAngleSaveRecovery }
export type AngleSaveRecovery = ReturnType<typeof useAngleSaveRecovery>
