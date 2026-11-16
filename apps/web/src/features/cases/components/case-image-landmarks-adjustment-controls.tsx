"use client"

import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import type { KeyboardEvent, ReactNode } from "react"

import { LANDMARK_POINT_NAMES } from "../lib/landmarks-editor"
import type { LandmarksAdjustmentTarget } from "../lib/landmarks-interaction"
import type { TploLandmarksInput } from "../schemas/image-plan.schema"
import { useViewerBoundary } from "./viewer-tool-action"
import { ViewerMeasurementAction, ViewerMeasurementCard, ViewerMeasurementSection, ViewerMeasurementVisibility } from "./viewer-measurement-card"
import { CasePanelHelp } from "./case-panel-help"

function CaseImageLandmarksAdjustmentControls({ target, canAdjust, children, onTargetChange, onNudge, readFailure,
  method, editing, canOpen, onEdit, valueVisible, canPresent, onToggleValue, deletion }: {
  target: LandmarksAdjustmentTarget; canAdjust: boolean; children: ReactNode
  onTargetChange: (target: LandmarksAdjustmentTarget) => void
  onNudge: (event: KeyboardEvent<HTMLButtonElement>, target: LandmarksAdjustmentTarget) => void
  readFailure?: { canRetry: boolean; onRetry: () => void }
  method: TploLandmarksInput["method"]
  editing: boolean; canOpen: boolean; onEdit: () => void; valueVisible: boolean; canPresent: boolean; onToggleValue: () => void
  deletion?: { enabled: boolean; onRequest: () => void }
}) {
  const t = useTranslations("cases.workspace.landmarks"), menu = useTranslations("cases.workspace.measurementMenu")
  const { boundary, ref } = useViewerBoundary()
  return <div ref={ref} className="max-h-full max-w-full">
    <ViewerMeasurementCard title={`${t("entryTitle")} · ${t(`methodShort.${method}`)}`} name={t(`methods.${method}`)}
      valueLabel={menu("measurement")} values={children} boundary={boundary} data-landmarks-controls
      deletion={{ kind: "landmarks", label: t("deleteAction"), enabled: deletion?.enabled ?? false, onRequest: deletion?.onRequest ?? (() => {}) }}>
      <ViewerMeasurementSection label={menu("adjust")} legendAction={editing ?
        <CasePanelHelp label={t("help")} portalContainer={boundary} className="text-white/70 hover:bg-white/10 hover:text-white [&_svg]:size-3">
          {t("viewer.helpTip")}
        </CasePanelHelp> : null}>
        {editing ? <div className="grid min-w-0 grid-cols-4 gap-1" role="group" aria-label={t("adjustment.selectPoint")}>
          {LANDMARK_POINT_NAMES.map((point, index) => <ViewerMeasurementAction key={point} boundary={boundary}
            disabled={!canAdjust} active={target === point} label={String(index + 1)}
            aria-label={`${index + 1}. ${t(`points.${point}`)}`}
            description={t("adjustment.pointTip", { point: t(`points.${point}`) })} className="justify-center px-1"
            onClick={() => onTargetChange(point)} onKeyDown={event => onNudge(event, point)} />)}
        </div> : <ViewerMeasurementAction boundary={boundary} disabled={!canOpen} label={t("edit")}
          description={t("controlTips.edit")} onClick={onEdit} />}
      </ViewerMeasurementSection>
      <ViewerMeasurementSection label={menu("display")}>
        <ViewerMeasurementVisibility boundary={boundary} label={menu("value")} actionLabel={t(valueVisible ? "hideValue" : "showValue")}
          visible={valueVisible} disabled={!canPresent} onToggle={onToggleValue} />
      </ViewerMeasurementSection>
      {readFailure ? <div className="px-3 py-2"><ViewerMeasurementAction boundary={boundary} disabled={!readFailure.canRetry} label={t("placement.readAgain")}
        description={t("placement.readAgainTip")} icon={<RefreshCw aria-hidden="true" />} onClick={readFailure.onRetry} /></div> : null}
    </ViewerMeasurementCard>
  </div>
}

export { CaseImageLandmarksAdjustmentControls }
