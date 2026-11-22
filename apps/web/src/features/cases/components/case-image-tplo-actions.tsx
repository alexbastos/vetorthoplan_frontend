"use client"

import { useTranslations } from "next-intl"
import { ViewerEditActions } from "./viewer-edit-actions"

function CaseImageTploActions({ creating, canSave, canCancel, stale, fragmentDrawing, onSave, onCancel }: {
  creating: boolean; canSave: boolean; canCancel: boolean; stale: boolean; fragmentDrawing: boolean
  onSave: () => void; onCancel: () => void
}) {
  const t = useTranslations("cases.workspace.tplo.geometry")
  return <ViewerEditActions label={t("actions")} pending={false} data-tplo-actions
    cancel={{ disabled: !canCancel, label: t(stale ? "loadSaved" : creating ? "discard" : "cancel"), description: t("cancelTip"), onClick: onCancel }}
    confirm={{ disabled: !canSave, label: t(creating ? "save" : "update"), description: t("saveTip"), icon: "check", onClick: onSave }}>
    {fragmentDrawing ? <p role="status" className="sr-only">{t("partial")}</p> : null}
  </ViewerEditActions>
}

export { CaseImageTploActions }
