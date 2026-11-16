"use client"

import { Plus, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import type { KeyboardEvent, ReactNode } from "react"

import type { AngleAdjustmentTarget } from "../lib/angle-interaction"
import { useViewerBoundary } from "./viewer-tool-action"
import { CaseImageAngleValueControl } from "./case-image-angle-value-control"
import { ViewerMeasurementAction, ViewerMeasurementCard, ViewerMeasurementSection, ViewerMeasurementVisibility } from "./viewer-measurement-card"

function CaseImageAngleToolbar({ name, editing, dirty, canAdjust, target, valueVisible, hasGeometry, currentDegrees, canStartNew, readError, canRetryRead, deletion, children,
  onEdit, onTargetChange, onNudge, onSetDegrees, onToggleValue, onNew, onRetryRead }: {
  name: string; editing: boolean; dirty: boolean; canAdjust: boolean; target: AngleAdjustmentTarget; valueVisible: boolean; hasGeometry: boolean
  canStartNew: boolean; readError: boolean; canRetryRead: boolean; children: ReactNode
  deletion: { id: string; enabled: boolean; onRequest: () => void } | null
  currentDegrees: number | null; onSetDegrees: (degrees: number) => boolean
  onEdit: () => boolean; onTargetChange: (target: AngleAdjustmentTarget) => void; onNudge: (event: KeyboardEvent<HTMLButtonElement>, target: AngleAdjustmentTarget) => void
  onToggleValue: () => void; onNew: () => void; onRetryRead: () => void
}) {
  const t = useTranslations("cases.workspace.angle"), menu = useTranslations("cases.workspace.measurementMenu")
  const { boundary, ref } = useViewerBoundary()
  const pickTarget = (part: AngleAdjustmentTarget) => {
    if (!editing && !onEdit()) return
    onTargetChange(part)
  }

  return <div ref={ref} className="max-h-full max-w-full">
    <ViewerMeasurementCard title={t("title")} name={name} valueLabel={menu("measurement")} values={children} boundary={boundary} data-angle-controls
      deletion={deletion ? { ...deletion, kind: "angle", label: t("deleteAction") } : null}>
      {dirty ? <p className="sr-only" role="status">{t("unsavedDraft")}</p> : null}
      <ViewerMeasurementSection label={menu("adjust")}>
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-1">
            {(["start", "vertex", "end"] as const).map(part => <ViewerMeasurementAction key={part} boundary={boundary}
              disabled={!canAdjust || !hasGeometry} active={editing && target === part} label={menu(part)}
              aria-label={t(`targets.${part}`)} description={t(`controlTips.${part}`)} className="justify-center px-1"
              onClick={() => pickTarget(part)} onKeyDown={event => onNudge(event, part)} />)}
          </div>
        </div>
      </ViewerMeasurementSection>
      <CaseImageAngleValueControl enabled={canAdjust && hasGeometry} currentDegrees={currentDegrees} onApply={onSetDegrees} boundary={boundary} />
      {hasGeometry ? <ViewerMeasurementSection label={menu("display")}>
        <ViewerMeasurementVisibility boundary={boundary} label={menu("value")} actionLabel={t(valueVisible ? "hideValue" : "showValue")}
          visible={valueVisible} onToggle={onToggleValue} />
      </ViewerMeasurementSection> : null}
      <div className="space-y-1 px-3 py-2.5">
        <ViewerMeasurementAction boundary={boundary} disabled={!canStartNew} label={t("placement.new")} description={t("placement.newTip")}
          onClick={onNew} icon={<Plus aria-hidden="true" />} />
        {readError ? <ViewerMeasurementAction boundary={boundary} disabled={!canRetryRead} label={t("readAgain")} description={t("readErrorDescription")}
          onClick={onRetryRead} icon={<RefreshCw aria-hidden="true" />} /> : null}
      </div>
    </ViewerMeasurementCard>
  </div>
}

export { CaseImageAngleToolbar }
