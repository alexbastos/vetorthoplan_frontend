"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"

import { toast } from "@/lib/notifications"
import { isLandmarksCommand, type SaveLandmarksInput } from "../schemas/image-plan-command.schema"
import type { ImageLandmarksState, LandmarksClearCommand } from "./use-image-landmarks"

// The writer owns persistence and acknowledgement. Recovery checks only GET;
// it already reports its result, so checking must not emit a second notice.
function useLandmarksSaveActions(landmarks: ImageLandmarksState, identity: { caseId: string; imageId: string }, onSaved: (command: SaveLandmarksInput) => void) {
  const client = useQueryClient(), t = useTranslations("cases.workspace.landmarks")
  const mounted = useRef(false), pending = useRef(false)
  const scope = useRef({ client, ...identity, editorGeneration: landmarks.contextGeneration, generation: 0 })
  if (scope.current.client !== client || scope.current.caseId !== identity.caseId || scope.current.imageId !== identity.imageId) {
    scope.current = { client, ...identity, editorGeneration: landmarks.contextGeneration, generation: scope.current.generation + 1 }
  }
  scope.current.editorGeneration = landmarks.contextGeneration
  const generation = scope.current.generation
  const editorGeneration = landmarks.contextGeneration
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const current = () => mounted.current && scope.current.generation === generation && scope.current.editorGeneration === editorGeneration && scope.current.client === client
    && scope.current.caseId === identity.caseId && scope.current.imageId === identity.imageId

  async function submit(checkOnly: boolean, expectedDeletion?: LandmarksClearCommand) {
    if (!current() || pending.current) return
    const deleting = Boolean(expectedDeletion || landmarks.editor?.kind === "landmarks-clear")
    pending.current = true
    try {
      const result = await (checkOnly ? landmarks.recovery.check() : landmarks.submit(expectedDeletion))
      if (!result || !current() || result.code === "CLINICAL_CONTEXT_CHANGED") return
      if (result.phase === "saved" && isLandmarksCommand(result.edit)) {
        onSaved(result.edit)
        if (!checkOnly) {
          const removed = result.edit.kind === "landmarks-clear"
          if (result.code === "LANDMARKS_ALREADY_REMOVED") toast.info(t("recovery.alreadyRemoved"), { description: t("recovery.alreadyRemovedDescription") })
          else toast.success(t(removed ? "recovery.deleted" : "recovery.saved"), { description: t(removed ? "recovery.deletedDescription" : "recovery.savedDescription") })
        }
      } else if (!checkOnly && result.code !== "OPERATION_BLOCKED") {
        const key = result.phase === "conflict" ? "recovery.conflict" : result.phase === "uncertain" ? "recovery.uncertain" : deleting ? "deleteError" : "saveError"
        toast.error(t(`${key}Title`), { description: t(key === "saveError" || key === "deleteError" ? `${key}Description` : key) })
      }
      return result
    } catch {
      if (current()) toast.error(t(deleting ? "deleteErrorTitle" : "saveErrorTitle"), { description: t(deleting ? "deleteErrorDescription" : "saveErrorDescription") })
    } finally { pending.current = false }
  }

  return { save: (expectedDeletion?: LandmarksClearCommand) => submit(false, expectedDeletion), check: () => submit(true) }
}

export { useLandmarksSaveActions }
