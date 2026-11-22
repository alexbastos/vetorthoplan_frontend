"use client"

import { useTranslations } from "next-intl"
import type { TploDeletionState } from "../hooks/use-tplo-deletion"
import { ViewerMeasurementDeleteDialog } from "./viewer-measurement-delete-dialog"

function CaseImageTploDeleteDialog({ deletion }: { deletion: TploDeletionState }) {
  const t = useTranslations("cases.workspace.tplo")
  if (!deletion.request) return null
  const { phase, pending, checkOnly, conflict, staleEditor, readError } = deletion
  const discard = conflict || deletion.committed && phase === "error"
  const action = pending ? phase === "checking" ? "recovery.checking" : "deletion.pending"
    : checkOnly ? "recovery.check" : readError ? "read.retry" : discard ? "geometry.loadSaved" : "deletion.confirm"
  const status = checkOnly ? "deletion.uncertain" : staleEditor ? "deletion.stale" : readError ? "readErrorDescription"
    : conflict ? "recovery.conflict" : phase === "error" ? "deletion.error" : null
  return <ViewerMeasurementDeleteDialog kind="tplo" title={t("deletion.title")} description={t("deletion.description")}
    warning={deletion.dirty ? t("deletion.dirty") : undefined} status={!pending && status ? t(status) : undefined}
    pending={pending} canCancel={deletion.canCancel} canConfirm={deletion.canConfirm} confirmLabel={t(action)}
    neutralConfirm={checkOnly || discard || readError} onCancel={deletion.cancel} onConfirm={() => void deletion.confirm()} />
}

export { CaseImageTploDeleteDialog }
