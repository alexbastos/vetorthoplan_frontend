"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"

import { toast } from "@/lib/notifications"
import { IDLE_CALIBRATION_SAVE, isPlanImageDeleted, type ImagePlanSaveState } from "../lib/calibration-save-state"
import { isCaseDeletionLocked } from "../lib/case-deletion"
import { checkImagePlanSave, discardPlanEditSave, isImagePlanSaveInFlight, subscribeImagePlanSave } from "../lib/image-plan-saving"
import { SavePlanEditSchema, type PlanSaveCommand, type SavePlanEditInput } from "../schemas/image-plan-command.schema"
import type { CaseImage } from "../types/case-image"
import { casesQueryKeys as keys } from "./cases-query-keys"

function useMeasurementSaveRecovery<T extends SavePlanEditInput>(image: CaseImage, caseLocked: boolean, config: {
  family: "angle" | "circle" | "landmarks" | "tplo"
  isCommand: (command: PlanSaveCommand | undefined) => command is T
}) {
  const client = useQueryClient()
  const t = useTranslations(`cases.workspace.${config.family}`)
  const identity = { caseId: image.caseId, imageId: image.id }
  const key = keys.imagePlanSave(image.caseId, image.id)
  const mounted = useRef(false)
  const verifying = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const { data: sharedReceipt } = useQuery<ImagePlanSaveState>({ queryKey: key, queryFn: async () => IDLE_CALIBRATION_SAVE,
    enabled: false, initialData: IDLE_CALIBRATION_SAVE, gcTime: Infinity })
  const receiptQuery = client.getQueryCache().find({ queryKey: key, exact: true })
  const scope = useRef({ client, ...identity, receiptQuery, caseLocked, generation: 0 })
  if (scope.current.client !== client || scope.current.caseId !== image.caseId || scope.current.imageId !== image.id
    || scope.current.receiptQuery !== receiptQuery || scope.current.caseLocked !== caseLocked) {
    scope.current = { client, ...identity, receiptQuery, caseLocked, generation: scope.current.generation + 1 }
  }
  const generation = scope.current.generation
  const receipt = config.isCommand(sharedReceipt.edit) ? sharedReceipt : IDLE_CALIBRATION_SAVE
  const command = config.isCommand(receipt.edit) ? receipt.edit : null
  const active = Boolean(command && receipt.phase !== "idle" && receipt.phase !== "saved")
  const deletion = useQuery<{ phase: string }>({ queryKey: keys.imageDeletion(image.caseId, image.id),
    queryFn: async () => ({ phase: "idle" }), enabled: false, initialData: { phase: "idle" }, gcTime: Infinity }).data
  const deleting = caseLocked || ["deleting", "checking", "uncertain", "deleted"].includes(deletion.phase)
  const check = useMutation({ mutationFn: (expected: T) => checkImagePlanSave(client, identity, expected), retry: false })
  const subscribe = useCallback((notify: () => void) => subscribeImagePlanSave(client, { caseId: image.caseId, imageId: image.id }, notify), [client, image.caseId, image.id])
  const snapshot = useCallback(() => isImagePlanSaveInFlight(client, { caseId: image.caseId, imageId: image.id }), [client, image.caseId, image.id])
  const inFlight = useSyncExternalStore(subscribe, snapshot, () => false)
  const pending = check.isPending || inFlight
  const canCheck = active && !deleting && !pending && ["uncertain", "saving", "checking"].includes(receipt.phase)
  const canDiscard = active && !deleting && !pending && (receipt.phase === "conflict" || receipt.phase === "error")
  const currentCommand = () => {
    const current = client.getQueryData<ImagePlanSaveState>(key)?.edit
    const expected = SavePlanEditSchema.safeParse(command), actual = SavePlanEditSchema.safeParse(current)
    return expected.success && actual.success && JSON.stringify(expected.data) === JSON.stringify(actual.data)
  }
  const currentScope = () => mounted.current && scope.current.generation === generation && !scope.current.caseLocked && scope.current.client === client
    && scope.current.caseId === image.caseId && scope.current.imageId === image.id && Boolean(receiptQuery
      && scope.current.receiptQuery === receiptQuery && client.getQueryCache().find({ queryKey: key, exact: true }) === receiptQuery)
    && currentCommand() && !isPlanImageDeleted(client, identity) && !isCaseDeletionLocked(client, image.caseId)
  const deletingNow = () => ["deleting", "checking", "uncertain", "deleted"].includes(client.getQueryData<{ phase: string }>(keys.imageDeletion(image.caseId, image.id))?.phase ?? "idle")

  async function verify() {
    if (!command || !canCheck || verifying.current || !currentScope() || deletingNow()) return
    verifying.current = true
    try {
      const result = await check.mutateAsync(command)
      if (!currentScope()) return { phase: "error" as const, code: "CLINICAL_CONTEXT_CHANGED" }
      if (result.code === "CLINICAL_CONTEXT_CHANGED") return result
      if (result.phase === "saved") {
        if (result.code === `${config.family.toUpperCase()}_ALREADY_REMOVED`) {
          toast.info(t("recovery.alreadyRemoved"), { description: t("recovery.alreadyRemovedDescription") })
        } else {
          const deleted = command.kind === "landmarks-clear" || command.kind === `${config.family}-delete`
          toast.success(t(deleted ? "recovery.deleted" : "recovery.saved"), {
            description: t(deleted ? "recovery.deletedDescription" : "recovery.savedDescription"),
          })
        }
      } else if (result.code !== "OPERATION_BLOCKED") {
        const conflict = result.phase === "conflict"
        toast.error(t(conflict ? "recovery.conflictTitle" : "recovery.uncertainTitle"), {
          description: t(conflict ? "recovery.conflict" : "recovery.uncertain"),
        })
      }
      return result
    } catch {
      if (currentScope()) toast.error(t("recovery.uncertainTitle"), { description: t("recovery.uncertain") })
    } finally { verifying.current = false }
  }

  function discard() {
    return Boolean(command && canDiscard && currentScope() && !deletingNow() && discardPlanEditSave(client, identity, command))
  }

  return { receipt, command, active, pending, canCheck, canDiscard, check: verify, discard }
}

export { useMeasurementSaveRecovery }
