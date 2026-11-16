"use client"

import { Crosshair, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import type { KeyboardEvent, ReactNode } from "react"

import type { DistanceAdjustmentTarget } from "../lib/distance-line-interaction"
import type { SegmentMeasure } from "../lib/segment-measure"
import { useViewerBoundary } from "./viewer-tool-action"
import { ViewerMeasurementAction, ViewerMeasurementCard, ViewerMeasurementSection, ViewerMeasurementVisibility } from "./viewer-measurement-card"

type DistanceToolbarProps = {
  name: string; hasGeometry: boolean; editable: boolean; editing: boolean; dirty: boolean
  target: DistanceAdjustmentTarget; children: ReactNode
  onPlace: () => void; onTargetChange: (target: DistanceAdjustmentTarget) => void
  onNudge: (event: KeyboardEvent<HTMLButtonElement>, target: DistanceAdjustmentTarget) => void
  measure: SegmentMeasure; canChangeMeasure: boolean; onMeasureChange: (measure: SegmentMeasure) => void
  creating: boolean; canStartNew: boolean; onNew: () => void
  selection: { id: string; locked: boolean; valueVisible: boolean; canEdit: boolean; canDelete: boolean
    onEdit: () => void; onToggleValue: () => void; onDelete: () => void } | null
}

function CaseImageDistanceToolbar({ name, hasGeometry, editable, editing, dirty, target, children, onPlace, onTargetChange, onNudge, selection,
  measure, canChangeMeasure, onMeasureChange, creating, canStartNew, onNew }: DistanceToolbarProps) {
  const t = useTranslations("cases.workspace.distance"), menu = useTranslations("cases.workspace.measurementMenu")
  const { boundary, ref } = useViewerBoundary()
  const canAdjust = editing ? editable : Boolean(selection?.canEdit && !selection.locked)
  const pickTarget = (part: DistanceAdjustmentTarget) => {
    if (!editing) selection?.onEdit()
    onTargetChange(part)
  }

  return <div ref={ref} className="max-h-full max-w-full">
    <ViewerMeasurementCard title={measure === "length" ? t("title") : menu("circle")} name={name} boundary={boundary}
      data-distance-controls valueLabel={t(`measureModes.${measure}`)} values={children}
      deletion={selection ? { kind: "distance", id: selection.id, label: t("deleteAction"), enabled: selection.canDelete, onRequest: selection.onDelete } : null}>
      <div className="sr-only">
        {editing && (!creating || dirty) ? <p role="status">{t(dirty ? "unsavedChanges" : "editingSaved")}</p> : null}
        {selection?.locked ? <p role="status">{t("locked")}</p> : null}
        <p>{t(editing ? hasGeometry ? "adjustHint" : "drawHint" : "pickHint")}</p>
      </div>
      {measure !== "length" ? <ViewerMeasurementSection label={menu("mode")}>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label={t("measureMode")}>
          {(["radius", "diameter"] as const).map(part => <ViewerMeasurementAction key={part} boundary={boundary}
            active={measure === part} disabled={!canChangeMeasure || !hasGeometry} label={t(`measureModes.${part}`)}
            description={t(`measureModeTips.${part}`)} onClick={() => onMeasureChange(part)} className="justify-center" />)}
        </div>
      </ViewerMeasurementSection> : null}
      <ViewerMeasurementSection label={menu("adjust")}>
        <div className="space-y-1">
          {editing && !hasGeometry ? <ViewerMeasurementAction boundary={boundary} disabled={!editable} label={t("place")}
            description={t("controlTips.place")} onClick={onPlace} icon={<Crosshair aria-hidden="true" />} /> : null}
          <div className="grid grid-cols-2 gap-1">
            {(["start", "end"] as const).map(part => <ViewerMeasurementAction key={part} boundary={boundary} active={editing && target === part}
              disabled={!canAdjust || !hasGeometry} label={t(`targets.${part}`)} description={t(`controlTips.${part}`)}
              onClick={() => pickTarget(part)} onKeyDown={event => onNudge(event, part)} />)}
          </div>
        </div>
      </ViewerMeasurementSection>
      {selection ? <ViewerMeasurementSection label={menu("display")}>
        <ViewerMeasurementVisibility boundary={boundary} label={menu("value")} actionLabel={t(selection.valueVisible ? "hideValue" : "showValue")}
          visible={selection.valueVisible} onToggle={selection.onToggleValue} />
      </ViewerMeasurementSection> : null}
      {measure === "length" ? <div className="px-3 py-2.5">
        <ViewerMeasurementAction boundary={boundary} disabled={!canStartNew} label={t("new")} description={t("newTip")}
          onClick={onNew} icon={<Plus aria-hidden="true" />} />
      </div> : null}
    </ViewerMeasurementCard>
  </div>
}

export { CaseImageDistanceToolbar }
