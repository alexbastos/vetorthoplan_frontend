"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"

import { toast } from "@/lib/notifications"
import { isAngleCommand } from "../schemas/image-plan-command.schema"
import type { ImageAngleState } from "./use-image-angle"

// Remain mounted while acknowledgement clears the editor. Checking delegates
// to recovery: it already reports the outcome and never replays the write.
function useAngleSaveActions(angle: ImageAngleState, identity: { caseId: string; imageId: string }, onSaved: (id: string) => void) {
  const client = useQueryClient(), t = useTranslations("cases.workspace.angle")
  const mounted = useRef(false), pending = useRef(false)
  const scope = useRef({ client, ...identity })
  scope.current = { client, ...identity }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const current = () => mounted.current && scope.current.client === client
    && scope.current.caseId === identity.caseId && scope.current.imageId === identity.imageId

  async function submit(checkOnly: boolean) {
    if (!current() || pending.current) return
    const deleting = angle.editor?.kind === "angle-delete" || angle.command()?.kind === "angle-delete"
    pending.current = true
    try {
      const result = await (checkOnly ? angle.recovery.check() : angle.submit())
      if (!result || !current() || result.code === "CLINICAL_CONTEXT_CHANGED") return
      if (result.phase === "saved" && isAngleCommand(result.edit)) {
        onSaved(result.edit.id)
        if (!checkOnly) {
          if (result.code === "ANGLE_ALREADY_REMOVED") toast.info(t("recovery.alreadyRemoved"), { description: t("recovery.alreadyRemovedDescription") })
          else {
            const deleted = result.edit.kind === "angle-delete"
            toast.success(t(deleted ? "recovery.deleted" : "recovery.saved"), { description: t(deleted ? "recovery.deletedDescription" : "recovery.savedDescription") })
          }
        }
      } else if (!checkOnly && result.code !== "OPERATION_BLOCKED") {
        const key = result.phase === "conflict" ? "recovery.conflict" : result.phase === "uncertain" ? "recovery.uncertain"
          : result.edit?.kind === "angle-delete" ? "deleteError" : "saveError"
        toast.error(t(`${key}Title`), { description: t(key === "saveError" || key === "deleteError" ? `${key}Description` : key) })
      }
      return result
    } catch {
      if (current()) toast.error(t(deleting ? "deleteErrorTitle" : "saveErrorTitle"), { description: t(deleting ? "deleteErrorDescription" : "saveErrorDescription") })
    } finally { pending.current = false }
  }

  return { save: () => submit(false), check: () => submit(true) }
}

export { useAngleSaveActions }
