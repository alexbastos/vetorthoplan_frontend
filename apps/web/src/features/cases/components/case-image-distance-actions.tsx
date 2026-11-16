"use client"

import { useTranslations } from "next-intl"

import type { ImagePlanSaveState } from "../lib/calibration-save-state"
import { ViewerEditActions } from "./viewer-edit-actions"

function CaseImageDistanceActions({ intent, dirty, cancelDisabled, needsRebase, receipt, pending, canSave, canCheck, readError, canRetryRead, onCancel, onSave, onCheck, onRetryRead }: {
  intent: "create" | "update"; dirty: boolean; cancelDisabled: boolean; needsRebase: boolean
  receipt: ImagePlanSaveState; pending: boolean; canSave: boolean; canCheck: boolean; readError: boolean; canRetryRead: boolean
  onCancel: () => void; onSave: () => void; onCheck: () => void; onRetryRead: () => void
}) {
  const t = useTranslations("cases.workspace.distance")
  const conflict = needsRebase || receipt.phase === "conflict", uncertain = receipt.phase === "uncertain"
  const canSubmit = uncertain ? canCheck : readError ? canRetryRead : canSave && !conflict
  const action = receipt.phase === "checking" ? "checking" : pending ? "saving" : uncertain ? "checkSave" : readError ? "readAgain" : intent === "create" ? "save" : "update"
  const actionDescription = uncertain ? "check" : intent === "create" ? "save" : "update"
  const canDiscard = dirty || conflict || uncertain || pending || receipt.phase === "error"

  return <ViewerEditActions label={t("editActions")} pending={pending} data-distance-actions
    cancel={canDiscard ? { disabled: cancelDisabled, label: t(conflict ? "loadSaved" : "cancelEditing"),
      description: t(conflict ? "controlTips.loadSaved" : "controlTips.cancel"), onClick: onCancel } : null}
    confirm={{ disabled: pending || (!canSubmit && !readError), ariaDisabled: !canSubmit || pending,
      description: readError ? t("readErrorDescription") : t(`controlTips.${actionDescription}`), label: t(action),
      icon: uncertain || readError ? "refresh" : "check", tone: readError && !uncertain ? "cancel" : "save",
      onClick: () => {
        if (!canSubmit || pending) return
        if (uncertain) onCheck()
        else if (readError) onRetryRead()
        else onSave()
      } }}>
    {conflict ? <p className="sr-only" role="status">{t("planChanged")}</p> : null}
    {uncertain ? <p className="sr-only" role="status">{t("uncertainDescription")}</p> : null}
  </ViewerEditActions>
}

export { CaseImageDistanceActions }
