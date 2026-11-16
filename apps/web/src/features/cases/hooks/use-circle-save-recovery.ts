"use client"

import { isCircleCommand } from "../schemas/image-plan-command.schema"
import type { CaseImage } from "../types/case-image"
import { useMeasurementSaveRecovery } from "./use-measurement-save-recovery"

const circleRecovery = { family: "circle", isCommand: isCircleCommand } as const

function useCircleSaveRecovery(image: CaseImage, caseLocked: boolean) {
  return useMeasurementSaveRecovery(image, caseLocked, circleRecovery)
}

export { useCircleSaveRecovery }
export type CircleSaveRecovery = ReturnType<typeof useCircleSaveRecovery>
