"use client"

import { ChevronDown, ChevronUp, LockKeyhole, RefreshCw } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useId, useState, type ReactNode } from "react"
import { TooltipHint } from "@/components/ui/tooltip"

import { formatAngleDegrees } from "../lib/angle-format"
import { formatDistanceLength } from "../lib/distance-format"
import type { SavedTplo } from "../lib/tplo-result"
import { CasePanelHelp } from "./case-panel-help"
import { ViewerMeasurementAction } from "./viewer-measurement-card"
import { useViewerBoundary, viewerTooltipProps } from "./viewer-tool-action"

function CaseImageTploSaved({ objects, selectedId, dirtyId, selectionDisabled, onSelect, readError, canRetryRead, refreshing, onRetryRead, children, headerAction }: {
  objects: readonly SavedTplo[]; selectedId: string | null; dirtyId?: string | null; selectionDisabled: boolean; onSelect: (id: string) => void;
  readError: boolean; canRetryRead: boolean; refreshing: boolean; onRetryRead: () => void
  children?: ReactNode; headerAction?: ReactNode
}) {
  const t = useTranslations("cases.workspace.tplo"), format = useFormatter(), id = useId()
  const { boundary, ref } = useViewerBoundary()
  const [expanded, setExpanded] = useState(false)
  const visible = objects.filter(item => item.object.visible !== false)
  const current = visible.find(item => item.object.id.toLowerCase() === selectedId?.toLowerCase()) ?? visible[0]
  const collapsedRows = visible.slice(0, 2)
  if (current && !collapsedRows.includes(current)) collapsedRows[1] = current
  const rows = expanded ? visible : collapsedRows
  return <section ref={ref} aria-labelledby={id} data-tplo-saved
    className="max-h-full w-56 max-w-full overflow-y-auto overscroll-contain rounded-[var(--radius-token-md)] border border-white/10 bg-[var(--color-obsidian)] text-white shadow-sm">
    <header className="flex min-h-10 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
      <h3 className="min-w-0 truncate text-xs font-medium" id={id}>{t("read.title")}</h3>
      <div className="ml-auto flex shrink-0 items-center gap-0.5">{headerAction}
      {visible.length > 2 ? <TooltipHint {...viewerTooltipProps(boundary)} content={t(expanded ? "read.collapse" : "read.expand")}>
        <button type="button" aria-label={t(expanded ? "read.collapse" : "read.expand")}
          aria-expanded={expanded} aria-controls={`${id}-list`} onClick={() => setExpanded(value => !value)}
          className="inline-flex size-7 items-center justify-center rounded-[var(--radius-token-sm)] outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70">
          {expanded ? <ChevronUp aria-hidden="true" className="size-3.5" /> : <ChevronDown aria-hidden="true" className="size-3.5" />}
        </button>
      </TooltipHint> : null}
      </div>
    </header>
    <div className="space-y-2 p-3">
      <p className="sr-only">{t("read.legend")}</p>
      {readError ? <div className="space-y-2">
        <p role="status" className="text-[11px] leading-relaxed text-white/70">{t("readErrorDescription")}</p>
        <ViewerMeasurementAction boundary={boundary} label={t("read.retry")} description={t("read.retryTip")}
          disabled={!canRetryRead} loading={refreshing} icon={<RefreshCw aria-hidden="true" />} onClick={onRetryRead} />
      </div> : null}
      <ul className="space-y-2" id={`${id}-list`} aria-label={t("read.title")}>{rows.map(item => {
        const index = visible.indexOf(item)
        const object = item.object, selected = !item.ambiguous && object.id.toLowerCase() === selectedId?.toLowerCase()
        const dirty = object.id.toLowerCase() === dirtyId?.toLowerCase()
        const name = object.label?.trim() || t("read.defaultName", { index: index + 1 })
        const measurement = item.measurement, simulation = item.simulation
        const value = !dirty && measurement.status === "available" ? measurement : null
        const description = dirty ? t("read.draft") : measurement.status === "available" ? t("read.official") : t(`read.reasons.${measurement.reason}`)
        const simulationDescription = dirty ? t("read.draft") : simulation.status === "available" ? t("read.simulated") : t(`read.reasons.${simulation.reason}`)
        return <li key={`${object.id}:${index}`} className={`relative rounded-[var(--radius-token-sm)] border ${selected ? "border-white/30" : "border-white/10"}`}>
          <button type="button" aria-pressed={selected} aria-describedby={`${id}-${index}-status`}
            data-tplo-row={object.id} data-tplo-value-source={dirty ? "draft" : measurement.status === "available" ? "official" : "unavailable"}
            disabled={selectionDisabled || item.ambiguous || measurement.status === "unavailable" && measurement.reason === "ambiguous"}
            onClick={() => { if (!selected) onSelect(object.id) }}
            className="flex w-full flex-col gap-2 rounded-[var(--radius-token-sm)] px-2 py-2 text-left outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 aria-pressed:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
            <span className="flex min-h-5 w-full items-center gap-2 pr-6 text-xs font-medium"><span className="min-w-0 truncate">{name}</span>
              {object.locked ? <LockKeyhole aria-hidden="true" className="size-3 shrink-0" /> : null}</span>
            <span className="block w-full space-y-1 font-data text-xs font-medium tabular-nums text-white">
              <span className="flex min-h-8 items-center justify-between gap-2 rounded-[var(--radius-token-sm)] bg-white/10 px-2 py-1.5">
                <span>{t("geometry.diameter")}</span><span className="shrink-0">{value ? formatDistanceLength(value.radiusMm * 2, format.number) : "—"}</span>
              </span>
              <span className="flex min-h-8 items-center justify-between gap-2 px-2 py-1.5">
                <span>{t("simulation.rotation")}</span><span className="shrink-0">{value ? formatAngleDegrees(value.rotationDegrees, format.number) : "—"}</span>
              </span>
            </span>
            {!value ? <span className="text-[11px] leading-4 text-white/70">{description}</span> : null}
            <span className="sr-only" id={`${id}-${index}-status`}>{description}. {simulationDescription}{object.locked ? `. ${t("read.locked")}` : ""}</span>
          </button>
          <CasePanelHelp label={t("read.details", { name })} portalContainer={boundary}
            className="absolute right-1.5 top-2 size-5 text-white/70 hover:bg-white/10 hover:text-white [&_svg]:size-3">
            <p>{description}</p><p>{t("read.simulationState", { state: simulationDescription })}</p>
            {object.locked ? <p>{t("read.locked")}</p> : null}
            <p>{t("table.notValidated")}</p>
          </CasePanelHelp>
        </li>
      })}</ul>
      {!visible.length ? <p role="status" className="text-[11px] text-white/70">{t("read.empty")}</p> : null}
    </div>
    {children}
  </section>
}

export { CaseImageTploSaved }
