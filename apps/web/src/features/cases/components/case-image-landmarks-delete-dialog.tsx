"use client"

import { useTranslations } from "next-intl"

import type { LandmarksDeletionState } from "../hooks/use-landmarks-deletion"
import { ViewerMeasurementDeleteDialog } from "./viewer-measurement-delete-dialog"

function CaseImageLandmarksDeleteDialog({ deletion }: { deletion: LandmarksDeletionState }) {
  const t = useTranslations("cases.workspace.landmarks")
  const { request, phase, pending, checkOnly, conflict, staleEditor, readError, dirty, canConfirm, canCancel } = deletion
  if (!request) return null
  const action = pending ? phase === "checking" ? "recovery.checking" : "deleting"
    : checkOnly ? "checkDeletion" : readError ? "placement.readAgain" : conflict ? "loadSaved" : "confirmDeletion"
  const status = pending ? null : checkOnly ? "deleteUncertainDescription" : staleEditor ? "deleteStaleDescription" : readError ? "readErrorDescription"
    : conflict ? "recovery.conflict" : phase === "error" ? "deleteErrorDescription" : null

  return <ViewerMeasurementDeleteDialog kind="landmarks" title={t("deleteTitle")} description={t("deleteDescription")}
    warning={dirty ? t("deleteUnsavedDescription") : undefined} status={status ? t(status) : undefined}
    pending={pending} canCancel={canCancel} canConfirm={canConfirm} confirmLabel={t(action)}
    neutralConfirm={checkOnly || conflict || readError} onCancel={deletion.cancel} onConfirm={() => void deletion.confirm()} />
}

export { CaseImageLandmarksDeleteDialog }
