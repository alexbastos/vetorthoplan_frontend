"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"

import { toast } from "@/lib/notifications"
import { isCircleCommand } from "../schemas/image-plan-command.schema"
import type { CircleDeleteCommand, ImageCircleState } from "./use-image-circle"

function useCircleSaveActions(circle: ImageCircleState, identity: { caseId: string; imageId: string }, onSaved: (id: string) => void) {
  const client = useQueryClient(), t = useTranslations("cases.workspace.circle")
  const mounted = useRef(false), pending = useRef(false)
  const generation = circle.contextGeneration
  const scope = useRef({ client, ...identity, generation })
  scope.current = { client, ...identity, generation }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const current = () => mounted.current && scope.current.client === client && scope.current.generation === generation
    && scope.current.caseId === identity.caseId && scope.current.imageId === identity.imageId

  async function submit(checkOnly: boolean, expectedDeletion?: CircleDeleteCommand) {
    if (!current() || pending.current) return
    const deleting = Boolean(expectedDeletion || circle.editor?.kind === "circle-delete")
    pending.current = true
    try {
      const result = await (checkOnly ? circle.recovery.check() : circle.submit(expectedDeletion))
      if (!result || !current() || result.code === "CLINICAL_CONTEXT_CHANGED") return
      if (result.phase === "saved" && isCircleCommand(result.edit)) {
        onSaved(result.edit.id)
        if (!checkOnly) {
          if (result.code === "CIRCLE_ALREADY_REMOVED") toast.info(t("recovery.alreadyRemoved"), { description: t("recovery.alreadyRemovedDescription") })
          else {
            const deleted = result.edit.kind === "circle-delete"
            toast.success(t(deleted ? "recovery.deleted" : "recovery.saved"), { description: t(deleted ? "recovery.deletedDescription" : "recovery.savedDescription") })
          }
        }
      } else if (!checkOnly && result.code !== "OPERATION_BLOCKED") {
        const key = result.phase === "conflict" ? "recovery.conflict" : result.phase === "uncertain" ? "recovery.uncertain"
          : result.edit?.kind === "circle-delete" ? "deleteError" : "saveError"
        toast.error(t(`${key}Title`), { description: t(key === "saveError" || key === "deleteError" ? `${key}Description` : key) })
      }
      return result
    } catch {
      if (current()) toast.error(t(deleting ? "deleteErrorTitle" : "saveErrorTitle"), { description: t(deleting ? "deleteErrorDescription" : "saveErrorDescription") })
    } finally { pending.current = false }
  }

  return { save: (expectedDeletion?: CircleDeleteCommand) => submit(false, expectedDeletion), check: () => submit(true) }
}

export { useCircleSaveActions }
