"use client"

import { useTranslations } from "next-intl"

import type { ImagePlanSaveState } from "../lib/calibration-save-state"
import { ViewerMeasurementDeleteDialog } from "./viewer-measurement-delete-dialog"

function CaseImageDistanceDeleteDialog({ name, phase, pending, conflict, readError, dirty, canConfirm, canCancel, onConfirm, onCancel }: {
  name: string; phase: ImagePlanSaveState["phase"]; pending: boolean; conflict: boolean; readError: boolean; dirty: boolean
  canConfirm: boolean; canCancel: boolean; onConfirm: () => void; onCancel: () => void
}) {
  const t = useTranslations("cases.workspace.distance")
  const uncertain = phase === "uncertain"
  const action = pending ? phase === "checking" ? "checking" : "deleting"
    : uncertain ? "checkDeletion" : readError ? "readAgain" : conflict ? "loadSaved" : "deleteAction"
  const status = uncertain ? "deleteUncertainDescription" : readError ? "readErrorDescription"
    : conflict ? "planChanged" : phase === "error" ? "deleteErrorDescription" : null

  return <ViewerMeasurementDeleteDialog kind="distance" title={t("deleteTitle")} description={t("deleteDescription", { name })}
    warning={dirty ? t("deleteUnsavedDescription") : undefined} status={status ? t(status) : undefined}
    pending={pending} canCancel={canCancel} canConfirm={canConfirm} confirmLabel={t(action)}
    neutralConfirm={uncertain || conflict || readError} onCancel={onCancel} onConfirm={onConfirm} />
}

export { CaseImageDistanceDeleteDialog }
