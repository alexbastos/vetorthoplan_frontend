"use client"

import { Check, ChevronDown, RotateCw } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { TooltipHint } from "@/components/ui/tooltip"
import { formatAngleDegrees } from "../lib/angle-format"
import { CasePanelHelp } from "./case-panel-help"
import { ViewerMeasurementAction, ViewerMeasurementSection } from "./viewer-measurement-card"
import { useViewerBoundary, viewerTooltipProps } from "./viewer-tool-action"

type TploComparisonProps = { value: "original" | "simulated"; enabled: boolean; canSimulate: boolean; onChange: (value: "original" | "simulated") => void }

function CaseImageTploComparison({ value, enabled, canSimulate, onChange }: TploComparisonProps) {
  const t = useTranslations("cases.workspace.tplo.simulation"), { boundary, ref } = useViewerBoundary()
  return <div ref={ref}><ViewerMeasurementSection label={t("comparison")}>
    <div className="grid grid-cols-2 gap-1" role="group" aria-label={t("comparison")}>
      {(["original", "simulated"] as const).map(mode => <ViewerMeasurementAction key={mode} boundary={boundary} label={t(mode)}
        className="justify-center" active={value === mode} disabled={!enabled || mode === "simulated" && !canSimulate} onClick={() => onChange(mode)} />)}
    </div>
  </ViewerMeasurementSection></div>
}

function TploRotationInput({ degrees, live, canEdit, boundary, onApply }: {
  degrees: number; live: boolean; canEdit: boolean; boundary: HTMLElement | null; onApply: (degrees: number) => boolean
}) {
  const t = useTranslations("cases.workspace.tplo.simulation"), locale = useLocale(), id = useId()
  const initialInput = () => ({ degrees, input: String(degrees).replace(".", locale.startsWith("pt") ? "," : "."), error: false })
  const [entry, setEntry] = useState(initialInput)
  // Synchronize only committed changes, without remounting a focused field.
  if (entry.degrees !== degrees) setEntry(initialInput())
  const { input, error } = entry
  return <>
    <form className="flex items-center gap-1" onSubmit={event => {
      event.preventDefault()
      if (!canEdit || live) return
      const text = input.trim().replace(",", ".")
      const value = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ? Number(text) : NaN
      const invalid = !Number.isFinite(value) || value < -180 || value > 180 || !onApply(value)
      setEntry(previous => ({ ...previous, error: invalid }))
    }}>
      <Input aria-label={t("rotationInput")} type="text" inputMode="decimal" maxLength={32} value={input}
        disabled={!canEdit || live} onChange={event => { const input = event.target.value; setEntry(previous => ({ ...previous, input, error: false })) }}
        aria-invalid={error} aria-describedby={error ? id : undefined} className="font-data text-xs text-white"
        wrapperClassName="h-8 min-w-0 border-white/20 bg-white/5 focus-within:border-white/50" />
      <TooltipHint {...viewerTooltipProps(boundary)} content={t("apply")}><button type="submit" aria-label={t("apply")}
        disabled={!canEdit || live || !input.trim()} className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-token-sm)] text-[var(--color-sage-500)] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-40">
        <Check aria-hidden="true" className="size-3.5" />
      </button></TooltipHint>
    </form>
    {error ? <p role="alert" id={id} className="text-[11px] leading-4 text-[var(--color-coral-500)]">{t("invalid")}</p> : null}
  </>
}

function CaseImageTploRotationControls({ degrees, previewDegrees, canEdit, canRotate, active, source, statusText, comparison, onApply, onRotate, showValue = true, collapsed = false }: {
  degrees: number; previewDegrees: number | null; canEdit: boolean; canRotate: boolean; active: boolean
  source: "preview" | "official" | "unavailable"; statusText: string; comparison: TploComparisonProps
  onApply: (degrees: number) => boolean; onRotate: () => void
  showValue?: boolean; collapsed?: boolean
}) {
  const t = useTranslations("cases.workspace.tplo.simulation"), format = useFormatter()
  const { boundary, ref } = useViewerBoundary()
  const live = previewDegrees !== null
  const controls = <div className="space-y-2">
    {showValue ? <><output data-tplo-rotation-value data-tplo-result-source={source} className="font-data text-xs font-medium tabular-nums text-white">
      {live || source === "preview" ? "≈ " : ""}{formatAngleDegrees(previewDegrees ?? degrees, format.number)}
    </output>
    <p role="status" className="text-[11px] leading-4 text-white/70">{statusText}</p></> : null}
    {/* Reset text/error only when the committed angle changes, never per preview frame. */}
    <TploRotationInput degrees={degrees} live={live} canEdit={canEdit} boundary={boundary} onApply={onApply} />
    <ViewerMeasurementAction boundary={boundary} label={t("rotate")} description={t(collapsed ? "fragmentTip" : "hint")} icon={<RotateCw aria-hidden="true" />}
      active={active} disabled={!canRotate || live} onClick={onRotate} />
  </div>
  return <div ref={ref} data-tplo-rotation-controls className="border-b border-white/10">
    <details className="group/tplo-rotation" open={!collapsed}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 font-data text-[10px] font-medium leading-4 text-white/60 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">{t("rotationControl")}<CasePanelHelp label={t("help")} portalContainer={boundary}
          className="size-5 text-white/70 hover:bg-white/10 hover:text-white [&_svg]:size-3"><p>{t(collapsed ? "fragmentTip" : "hint")}</p></CasePanelHelp></span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 group-open/tplo-rotation:rotate-180" />
      </summary>
      <div className="px-3 pb-2.5">{controls}</div>
      <CaseImageTploComparison {...comparison} />
    </details>
  </div>
}

export { CaseImageTploRotationControls, CaseImageTploComparison }
export type { TploComparisonProps }
