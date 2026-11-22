"use client"

import { ChevronDown, Crosshair, Minus, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId } from "react"

import type { ImagePoint } from "../types/case-workspace"
import { tploFragmentIsDegenerate } from "../lib/tplo-fragment-editor"
import { CasePanelHelp } from "./case-panel-help"
import { ViewerMeasurementAction, ViewerMeasurementSection } from "./viewer-measurement-card"
import { useViewerBoundary } from "./viewer-tool-action"

function CaseImageTploFragmentControls({ points, activeVertex, canEdit, onBegin,
  onSelect, onInsert, onRemoveVertex, onClear }: {
  points: readonly ImagePoint[] | null; activeVertex: number | null; canEdit: boolean
  onBegin: () => void
  onSelect: (index: number) => void; onInsert: () => void; onRemoveVertex: () => void; onClear: () => void
}) {
  const t = useTranslations("cases.workspace.tplo.fragment"), id = useId(), { boundary, ref } = useViewerBoundary()
  const count = points?.length ?? 0, selected = activeVertex !== null && activeVertex >= 0 && activeVertex < count
  return <div ref={ref} data-tplo-fragment-controls className="border-b border-white/10">
    <ViewerMeasurementSection label={t("title")} legendAction={<CasePanelHelp label={t("help")} portalContainer={boundary}
      className="size-5 text-white/70 hover:bg-white/10 hover:text-white [&_svg]:size-3"><p>{t("adjustHint")}</p></CasePanelHelp>}>
      {points ? <div className="space-y-2">
        <label htmlFor={id} className="sr-only">{t("select")}</label>
        <select id={id} aria-label={t("select")} disabled={!canEdit} value={selected ? activeVertex : ""}
          onChange={event => { const index = Number(event.target.value); if (Number.isInteger(index) && index >= 0 && index < count) onSelect(index) }}
          className="min-h-8 w-full rounded-[var(--radius-token-sm)] border border-white/20 bg-[var(--color-obsidian)] px-2 font-data text-[11px] text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-40">
          <option value="" disabled>{t("select")}</option>
          {points.map((_, index) => <option key={index} value={index}>{t("vertex", { index: index + 1, count })}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-1">
          <ViewerMeasurementAction boundary={boundary} label={t("insert")} description={t("insertTip")} icon={<Plus aria-hidden="true" />}
            disabled={!canEdit || !selected || count >= 500} onClick={onInsert} />
          <ViewerMeasurementAction boundary={boundary} label={t("removeVertex")} description={t("removeVertexTip")} icon={<Minus aria-hidden="true" />}
            disabled={!canEdit || !selected || count <= 3} onClick={onRemoveVertex} />
        </div>
        {tploFragmentIsDegenerate(points) ? <p role="status" className="text-[11px] leading-4 text-white/70">{t("degenerate")}</p> : null}
        <details className="group/tplo-fragment">
          <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 rounded-[var(--radius-token-sm)] px-2 text-[11px] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 [&::-webkit-details-marker]:hidden">
            {t("options")}<ChevronDown aria-hidden="true" className="size-3.5 group-open/tplo-fragment:rotate-180" />
          </summary>
          <ViewerMeasurementAction boundary={boundary} label={t("redraw")} description={t("redrawTip")} icon={<RotateCcw aria-hidden="true" />} disabled={!canEdit} onClick={onBegin} />
          <ViewerMeasurementAction boundary={boundary} label={t("clear")} description={t("clearTip")} icon={<Trash2 aria-hidden="true" />} disabled={!canEdit} onClick={onClear} />
        </details>
      </div> : <ViewerMeasurementAction boundary={boundary} label={t("begin")} description={t("hint")} icon={<Crosshair aria-hidden="true" />}
        disabled={!canEdit} onClick={onBegin} />}
    </ViewerMeasurementSection>
  </div>
}

export { CaseImageTploFragmentControls }
