"use client"

import { Crosshair, RefreshCw, Trash2, Undo2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { CasePanelHelp } from "./case-panel-help"
import { ViewerEditActions } from "./viewer-edit-actions"
import { ViewerMeasurementAction, ViewerMeasurementCard } from "./viewer-measurement-card"
import { useViewerBoundary, ViewerToolAction } from "./viewer-tool-action"

function CaseImageTploFragmentDrawing({ name, count, canEdit, marking, stale, onMark, onUndo, onCancel, readFailure }: {
  name: string; count: number; canEdit: boolean; marking: boolean; stale: boolean
  onMark: () => void; onUndo: () => void; onCancel: () => void
  readFailure?: { canRetry: boolean; onRetry: () => void }
}) {
  const t = useTranslations("cases.workspace.tplo.fragment"), tTplo = useTranslations("cases.workspace.tplo")
  const { boundary, ref } = useViewerBoundary()
  return <div ref={ref} className="max-h-full max-w-full">
    <ViewerMeasurementCard title={name} name={name} boundary={boundary} data-tplo-fragment-drawing
      headerAction={<ViewerToolAction boundary={boundary} size="compact" tone="cancel" label={t("discard")}
        description={t("cancelTip")} disabled={!canEdit} onClick={onCancel}><Trash2 aria-hidden="true" /></ViewerToolAction>}
      valueLabel={t("title")} valueLegendAction={<CasePanelHelp label={t("help")} portalContainer={boundary}
        className="size-5 text-white/70 hover:bg-white/10 hover:text-white [&_svg]:size-3"><p>{t("keyboardHint")}</p></CasePanelHelp>}
      values={<div className="space-y-2">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <p role="status" className="font-data text-[11px] tabular-nums text-white/70">{t("progress", { count })}</p>
          <ViewerToolAction boundary={boundary} size="compact" label={t("undo")} description={t("undoTip")}
            disabled={!canEdit || count === 0} onClick={onUndo}><Undo2 aria-hidden="true" /></ViewerToolAction>
        </div>
        <ViewerMeasurementAction boundary={boundary} label={t("mark")} description={t("keyboardHint")} icon={<Crosshair aria-hidden="true" />}
          disabled={!canEdit || count >= 500} active={marking} onClick={onMark} />
        {count >= 500 ? <p role="status" className="text-[11px] leading-4 text-white/70">{t("limit")}</p> : null}
      </div>}>
      {stale ? <p role="status" className="px-3 py-2.5 text-[11px] leading-4 text-white/70">{tTplo("recovery.conflict")}</p> : null}
      {readFailure ? <div className="space-y-1 px-3 py-2.5">
        <p role="status" className="text-[11px] leading-4 text-white/70">{tTplo("readErrorDescription")}</p>
        <ViewerMeasurementAction boundary={boundary} label={tTplo("read.retry")} description={tTplo("read.retryTip")}
          disabled={!readFailure.canRetry} onClick={readFailure.onRetry} icon={<RefreshCw aria-hidden="true" />} />
      </div> : null}
    </ViewerMeasurementCard>
  </div>
}

function CaseImageTploFragmentActions({ count, canEdit, onFinish, onCancel }: {
  count: number; canEdit: boolean; onFinish: () => void; onCancel: () => void
}) {
  const t = useTranslations("cases.workspace.tplo.fragment")
  return <ViewerEditActions label={t("title")} pending={false} data-tplo-fragment-actions
    cancel={{ label: t("cancel"), description: t("cancelTip"), disabled: !canEdit, onClick: onCancel }}
    confirm={{ label: t("finish"), description: t("finishTip"), icon: "check", disabled: !canEdit || count < 3 || count > 500, onClick: onFinish }} />
}

export { CaseImageTploFragmentDrawing, CaseImageTploFragmentActions }
