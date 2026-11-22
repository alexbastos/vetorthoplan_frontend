"use client"

import { Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useViewerBoundary, ViewerToolAction } from "./viewer-tool-action"
import { ViewerMeasurementAction } from "./viewer-measurement-card"

function CaseImageTploDeleteButton({ id, enabled, onRequest }: { id: string; enabled: boolean; onRequest: () => void }) {
  const t = useTranslations("cases.workspace.tplo.deletion"), { boundary, ref } = useViewerBoundary()
  return <span ref={ref}><ViewerToolAction boundary={boundary} size="compact" tone="cancel" label={t("action")}
    data-tplo-delete={id.toLowerCase()} disabled={!enabled} onClick={onRequest}><Trash2 aria-hidden="true" /></ViewerToolAction></span>
}

function CaseImageTploNewAction({ enabled, onCreate }: { enabled: boolean; onCreate: () => void }) {
  const t = useTranslations("cases.workspace.tplo.entry"), { boundary, ref } = useViewerBoundary()
  return <div className="border-t border-white/10 p-3" ref={ref}><ViewerMeasurementAction boundary={boundary} label={t("new")}
    disabled={!enabled} onClick={onCreate} icon={<Plus aria-hidden="true" />} /></div>
}

export { CaseImageTploDeleteButton, CaseImageTploNewAction }
