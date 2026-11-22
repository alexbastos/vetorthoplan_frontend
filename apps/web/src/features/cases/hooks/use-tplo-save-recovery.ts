"use client"

import { useQueryClient } from "@tanstack/react-query"

import { clearMatchingTploDraft, type TploDraft } from "../lib/tplo-draft"
import { isTploCommand } from "../schemas/image-plan-command.schema"
import type { CaseImage } from "../types/case-image"
import { casesQueryKeys as keys } from "./cases-query-keys"
import { useMeasurementSaveRecovery } from "./use-measurement-save-recovery"

const tploRecovery = { family: "tplo", isCommand: isTploCommand } as const

function useTploSaveRecovery(image: CaseImage, caseLocked: boolean) {
  const client = useQueryClient()
  const recovery = useMeasurementSaveRecovery(image, caseLocked, tploRecovery)
  function discard() {
    const command = recovery.command
    const draft = client.getQueryData<TploDraft | null>(keys.imageTploDraft(image.caseId, image.id))
    if (!command || !recovery.discard()) return false
    clearMatchingTploDraft(client, { caseId: image.caseId, imageId: image.id }, command, draft)
    return true
  }
  return { ...recovery, discard }
}

export { useTploSaveRecovery }
export type TploSaveRecovery = ReturnType<typeof useTploSaveRecovery>
