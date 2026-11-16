"use client"

import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import type { KeyboardEvent, ReactNode } from "react"

import type { CircleAdjustmentTarget } from "../lib/circle-interaction"
import type { CircleMeasure } from "../lib/circle-result"
import { useViewerBoundary } from "./viewer-tool-action"
import { ViewerMeasurementAction, ViewerMeasurementCard, ViewerMeasurementSection, ViewerMeasurementVisibility } from "./viewer-measurement-card"

function CaseImageCircleToolbar({ name, editing, dirty, canAdjust, canPresent, hasGeometry, target, measure, valueVisible, deletion,
  readError, canRetryRead, children, onEdit, onTargetChange, onNudge, onMeasureChange, onToggleValue, onRetryRead }: {
  name: string; editing: boolean; dirty: boolean; canAdjust: boolean; canPresent: boolean; hasGeometry: boolean
  target: CircleAdjustmentTarget; measure: CircleMeasure; valueVisible: boolean; readError: boolean; canRetryRead: boolean
  deletion: { id: string; enabled: boolean; onRequest: () => void } | null
  children: ReactNode; onEdit: () => boolean; onTargetChange: (target: CircleAdjustmentTarget) => void
  onNudge: (event: KeyboardEvent<HTMLButtonElement>, target: CircleAdjustmentTarget) => void
  onMeasureChange: (measure: CircleMeasure) => void; onToggleValue: () => void; onRetryRead: () => void
}) {
  const t = useTranslations("cases.workspace.circle"), menu = useTranslations("cases.workspace.measurementMenu")
  const { boundary, ref } = useViewerBoundary()
  const pickTarget = (part: CircleAdjustmentTarget) => {
    if (!editing && !onEdit()) return
    onTargetChange(part)
  }

  return <div ref={ref} className="max-h-full max-w-full">
    <ViewerMeasurementCard title={t("title")} name={name} valueLabel={t(`measures.${measure}`)} values={children} boundary={boundary} data-circle-controls
      deletion={deletion ? { ...deletion, id: deletion.id.toLowerCase(), kind: "circle", label: t("deleteAction") } : null}>
      {dirty ? <p className="sr-only" role="status">{t("unsavedDraft")}</p> : null}
      <ViewerMeasurementSection label={menu("mode")}>
        <div className="space-y-1" role="group" aria-label={t("displayMeasure")}>
          {(["radius", "diameter", "circumference"] as const).map(part => <ViewerMeasurementAction key={part} boundary={boundary}
            active={measure === part} disabled={!canPresent || !hasGeometry} label={t(`measures.${part}`)}
            onClick={() => onMeasureChange(part)} />)}
        </div>
      </ViewerMeasurementSection>
      <ViewerMeasurementSection label={menu("adjust")}>
        <div className="space-y-1">
          <ViewerMeasurementAction boundary={boundary} active={editing && target === "edge"} disabled={!canAdjust || !hasGeometry}
            label={t("targets.edge")} description={t("controlTips.edge")} onClick={() => pickTarget("edge")}
            onKeyDown={event => onNudge(event, "edge")} />
        </div>
      </ViewerMeasurementSection>
      {hasGeometry ? <ViewerMeasurementSection label={menu("display")}>
        <ViewerMeasurementVisibility boundary={boundary} label={menu("value")} actionLabel={t(valueVisible ? "hideValue" : "showValue")}
          visible={valueVisible} disabled={!canPresent} onToggle={onToggleValue} />
      </ViewerMeasurementSection> : null}
      {readError ? <div className="px-3 py-2.5"><ViewerMeasurementAction boundary={boundary} disabled={!canRetryRead}
        label={t("readAgain")} description={t("readErrorDescription")} onClick={onRetryRead} icon={<RefreshCw aria-hidden="true" />} /></div> : null}
    </ViewerMeasurementCard>
  </div>
}

export { CaseImageCircleToolbar }
