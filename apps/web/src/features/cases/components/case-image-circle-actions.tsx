"use client"

import { useTranslations } from "next-intl"

import type { ImagePlanSaveState } from "../lib/calibration-save-state"
import { ViewerEditActions } from "./viewer-edit-actions"

function CaseImageCircleActions({ creating, needsRebase, receipt, pending, canSave, canCheck, canCancel, readError, canRetryRead, onSave, onCheck, onCancel, onRetryRead }: {
  creating: boolean; needsRebase: boolean; receipt: ImagePlanSaveState; pending: boolean
  canSave: boolean; canCheck: boolean; canCancel: boolean; readError: boolean; canRetryRead: boolean
  onSave: () => void; onCheck: () => void; onCancel: () => void; onRetryRead: () => void
}) {
  const t = useTranslations("cases.workspace.circle")
  const conflict = needsRebase || receipt.phase === "conflict"
  const checkOnly = ["uncertain", "saving", "checking"].includes(receipt.phase)
  const canSubmit = !pending && (checkOnly ? canCheck : !conflict && (readError ? canRetryRead : canSave))
  const action = pending ? receipt.phase === "checking" ? "recovery.checking" : "recovery.saving"
    : checkOnly ? "recovery.check" : readError ? "readAgain" : creating ? "save" : "update"
  const description = checkOnly ? "recovery.checkTip" : readError ? "readErrorDescription" : creating ? "controlTips.save" : "controlTips.update"

  return <ViewerEditActions label={t("editActions")} pending={pending} data-circle-actions
    cancel={{ disabled: !canCancel, label: t(conflict ? "loadSaved" : "cancelEditing"),
      description: t(conflict ? "controlTips.loadSaved" : "controlTips.cancel"), onClick: onCancel }}
    confirm={{ disabled: !canSubmit, label: t(action), description: t(description), icon: checkOnly || readError ? "refresh" : "check",
      onClick: () => {
        if (!canSubmit) return
        if (checkOnly) onCheck()
        else if (readError) onRetryRead()
        else onSave()
      } }}>
    {conflict ? <p className="sr-only" role="status">{t("recovery.conflict")}</p> : null}
  </ViewerEditActions>
}

export { CaseImageCircleActions }
