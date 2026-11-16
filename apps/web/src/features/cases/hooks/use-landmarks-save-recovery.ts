"use client"

import { useQueryClient } from "@tanstack/react-query"

import { landmarksEditorMatchesCommand, type LandmarksEditor } from "../lib/landmarks-editor"
import { isLandmarksCommand } from "../schemas/image-plan-command.schema"
import type { CaseImage } from "../types/case-image"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useMeasurementSaveRecovery } from "./use-measurement-save-recovery"

const landmarksRecovery = { family: "landmarks", isCommand: isLandmarksCommand } as const

function useLandmarksSaveRecovery(image: CaseImage, caseLocked: boolean) {
  const client = useQueryClient()
  const recovery = useMeasurementSaveRecovery(image, caseLocked, landmarksRecovery)
  function discard() {
    const command = recovery.command
    if (!command || !recovery.discard()) return false
    const key = keys.imageLandmarksDraft(image.caseId, image.id)
    const draft = client.getQueryData<LandmarksEditor | null>(key)
    if (draft && landmarksEditorMatchesCommand(draft, command)) client.setQueryData(key, null)
    return true
  }
  return { ...recovery, discard }
}

export { useLandmarksSaveRecovery }
export type LandmarksSaveRecovery = ReturnType<typeof useLandmarksSaveRecovery>
