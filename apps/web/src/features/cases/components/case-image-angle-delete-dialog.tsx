"use client"

import { useTranslations } from "next-intl"

import type { AngleDeletionState } from "../hooks/use-angle-deletion"
import { ViewerMeasurementDeleteDialog } from "./viewer-measurement-delete-dialog"

function CaseImageAngleDeleteDialog({ deletion }: { deletion: AngleDeletionState }) {
  const t = useTranslations("cases.workspace.angle")
  const { request, phase, pending, checkOnly, conflict, staleEditor, readError, dirty, canConfirm, canCancel } = deletion
  if (!request) return null
  const action = pending ? phase === "checking" ? "recovery.checking" : "deleting"
    : checkOnly ? "checkDeletion" : readError ? "readAgain" : conflict ? "loadSaved" : "deleteAction"
  const status = pending ? null : checkOnly ? "deleteUncertainDescription" : staleEditor ? "deleteStaleDescription" : readError ? "readErrorDescription"
    : conflict ? "recovery.conflict" : phase === "error" ? "deleteErrorDescription" : null

  return <ViewerMeasurementDeleteDialog kind="angle" title={t("deleteTitle")} description={t("deleteDescription", { name: request.name })}
    warning={dirty ? t("deleteUnsavedDescription") : undefined} status={status ? t(status) : undefined}
    pending={pending} canCancel={canCancel} canConfirm={canConfirm} confirmLabel={t(action)}
    neutralConfirm={checkOnly || conflict || readError} onCancel={deletion.cancel} onConfirm={() => void deletion.confirm()} />
}

export { CaseImageAngleDeleteDialog }
