"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { toast } from "@/lib/notifications"
import type { ImageDistanceState } from "./use-image-distance"
import type { ImagePlanSaveState } from "../lib/calibration-save-state"
import { isDistanceCommand } from "../schemas/image-plan-command.schema"

type DistanceAdjustmentSource = "pointer" | "keyboard"
const keyboardSaveDelayMs = 600

// Stay mounted with the workspace: the editor disappears as soon as the writer
// acknowledges and clears its draft, before its mutation promise settles.
function useDistanceSaveActions(distance: ImageDistanceState, onSaved: (id: string, deleted: boolean) => void) {
  const t = useTranslations("cases.workspace.distance")
  const client = useQueryClient()
  const [pointerActive, setPointerActiveState] = useState(false)
  const pointerHeld = useRef(false)
  const [queued, setQueued] = useState<{
    id: string; revision: number; delay: number; client: typeof client; onConfirmed?: (revision: number) => void
  } | null>(null)
  const pending = useRef<typeof queued>(null)
  const cancelAutosave = useCallback(() => {
    pending.current = null
    setQueued(null)
  }, [])
  const setPointerActive = useCallback((active: boolean) => {
    pointerHeld.current = active
    setPointerActiveState(active)
  }, [])
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const latest = useRef({ client, distance, submit })
  latest.current = { client, distance, submit }

  async function submit(checkOnly: boolean, automatic = false): Promise<ImagePlanSaveState | undefined> {
    try {
      const result = await distance.submit(checkOnly)
      if (!result || !mounted.current || latest.current.client !== client || result.code === "CLINICAL_CONTEXT_CHANGED") return
      if (result.phase === "saved" && isDistanceCommand(result.edit)) {
        if (automatic) return result
        onSaved(result.edit.id, result.edit.kind === "distance-delete")
        if (result.code === "DISTANCE_ALREADY_REMOVED") toast.info(t("alreadyRemovedTitle"), { description: t("alreadyRemovedDescription") })
        else toast.success(t(result.edit.kind === "distance-delete" ? "deletedTitle" : "savedTitle"), {
          description: t(result.edit.kind === "distance-delete" ? "deletedDescription" : "savedDescription"),
        })
      } else {
        const key = result.phase === "conflict" ? "conflict" : result.phase === "uncertain" ? "uncertain" : result.edit?.kind === "distance-delete" ? "deleteError"
          : result.code === "CLINICAL_VALIDATION_INVALID" || result.code === "PLAN_SAVE_NOT_ALLOWED" || result.code === "ACCESS_DENIED" ? "notAllowed" : "saveError"
        toast.error(t(`${key}Title`), { description: t(`${key}Description`) })
      }
      return result
    } catch {
      if (mounted.current) toast.error(t("saveErrorTitle"), { description: t("saveErrorDescription") })
    }
  }

  function queueAutosave(source: DistanceAdjustmentSource, onConfirmed?: (revision: number) => void) {
    const command = distance.command()
    const previous = pending.current
    const confirmed = onConfirmed ?? (previous?.id === command?.id && previous?.revision === command?.baseRevision ? previous?.onConfirmed : undefined)
    pending.current = command && command.kind !== "distance-delete" ? {
      id: command.id, revision: command.baseRevision, delay: source === "keyboard" ? keyboardSaveDelayMs : 0, client, onConfirmed: confirmed,
    } : null
    setQueued(pending.current)
  }

  const readyToSave = distance.canSave && (distance.receipt.phase === "idle" || distance.receipt.phase === "saved")
  const editorId = distance.editor?.id, editorRevision = distance.editor?.baseRevision
  useEffect(() => {
    if (!queued || queued.client !== client || !readyToSave || pointerActive || queued.id !== editorId || queued.revision !== editorRevision) return
    const timer = window.setTimeout(() => {
      if (!mounted.current || pending.current !== queued || pointerHeld.current) return
      const current = latest.current
      const command = current.distance.command()
      if (current.client !== queued.client || command?.id !== queued.id || command.baseRevision !== queued.revision) return
      cancelAutosave()
      void current.submit(false, true).then(result => {
        if (result?.phase === "saved" && result.currentRevision !== undefined) queued.onConfirmed?.(result.currentRevision)
      })
    }, queued.delay)
    return () => window.clearTimeout(timer)
  }, [queued, client, pointerActive, readyToSave, editorId, editorRevision, cancelAutosave])

  return {
    save: () => submit(false), check: () => submit(true), queueAutosave, setPointerActive,
    cancelAutosave,
  }
}

export { useDistanceSaveActions }
