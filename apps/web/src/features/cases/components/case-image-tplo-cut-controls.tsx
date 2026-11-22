"use client"

import { Check, Crosshair, RefreshCw, Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useId, useState, type ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { TooltipHint } from "@/components/ui/tooltip"
import type { TploDiameterResult } from "../lib/tplo-geometry"
import type { TploPlacement } from "../lib/tplo-placement"
import type { TploAdjustmentTarget } from "../lib/tplo-interaction"
import { CasePanelHelp } from "./case-panel-help"
import { ViewerMeasurementAction, ViewerMeasurementCard, ViewerMeasurementSection } from "./viewer-measurement-card"
import { useViewerBoundary, viewerTooltipProps, ViewerToolAction } from "./viewer-tool-action"

function CaseImageTploCutControls({ placement, target, canEdit, canCancel, marking, diameterMm, fragmentMissing, stale,
  onMark, onTargetChange, onDiameterChange, onCancel, readFailure, children, fragmentDrawing = false, previewDiameterMm, name, values, valuesDescription, headerAction, footerAction, showCancel = true }: {
  placement: TploPlacement | null; target: TploAdjustmentTarget; canEdit: boolean; canCancel: boolean; marking: boolean
  diameterMm: number | null; fragmentMissing: boolean; stale: boolean; onMark: () => void; onTargetChange: (target: "center" | "edge") => void
  onDiameterChange: (value: number) => TploDiameterResult["status"]; onCancel: () => void
  readFailure?: { canRetry: boolean; onRetry: () => void }
  children?: ReactNode; fragmentDrawing?: boolean
  previewDiameterMm?: number
  name?: string; values?: ReactNode; valuesDescription?: ReactNode; headerAction?: ReactNode; footerAction?: ReactNode
  showCancel?: boolean
}) {
  const t = useTranslations("cases.workspace.tplo"), locale = useLocale(), id = useId(), { boundary, ref } = useViewerBoundary()
  const formatDiameter = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(value)
  const [diameter, setDiameter] = useState(() => diameterMm === null ? "" : formatDiameter(diameterMm))
  const [diameterEdited, setDiameterEdited] = useState(false)
  const [error, setError] = useState<"invalid" | "out-of-bounds" | null>(null)
  const help = (label: string, content: ReactNode) => <CasePanelHelp label={label} portalContainer={boundary}
    className="size-5 text-white/70 hover:bg-white/10 hover:text-white [&_svg]:size-3">{content}</CasePanelHelp>
  return <div ref={ref} className="max-h-full max-w-full">
    <ViewerMeasurementCard title={name ?? t("placement.title")} name={name ?? t("placement.title")} boundary={boundary} data-tplo-cut-controls
      headerAction={showCancel ? <ViewerToolAction boundary={boundary} size="compact" tone="cancel" label={t("placement.cancel")}
        description={t("placement.cancelTip")} disabled={!canCancel} onClick={onCancel}><Trash2 aria-hidden="true" /></ViewerToolAction> : headerAction}
      valueLabel={placement ? t("placement.progress", { step: placement.step === "center" ? 1 : 2 }) : t("geometry.values")}
      valueLegendAction={placement ? help(t("placement.help"), <><p>{t("placement.hint")}</p><p>{t("placement.keyboardHint")}</p></>)
        : help(t("menu.valuesHelp"), <><p>{t("menu.valuesHint")}</p>{valuesDescription}<p>{t("table.notValidated")}</p></>)}
      values={placement ? <>
        <p className="sr-only" role="status">{t(`placement.${placement.step}`)}. {t("placement.hint")}</p>
        <ViewerMeasurementAction boundary={boundary} label={t(`placement.${placement.step}`)} description={t("placement.hint")}
          icon={<Crosshair aria-hidden="true" />} disabled={!canEdit} active={marking} onClick={onMark} />
      </> : values}>
    {stale ? <p role="status" className="px-3 py-2 text-[11px] leading-4 text-white/70">{t("recovery.conflict")}</p> : null}
    {!placement && !fragmentDrawing ? <>
      <ViewerMeasurementSection label={t("placement.adjust")} legendAction={help(t("menu.adjustHelp"), <p>{t("viewer.adjustHint")}</p>)}>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label={t("placement.adjust")}>
          {(["center", "edge"] as const).map(part => <ViewerMeasurementAction key={part} boundary={boundary} label={t(`placement.${part}`)}
            description={t(`placement.${part}Tip`)} className="justify-center" active={target === part} disabled={!canEdit} onClick={() => onTargetChange(part)} />)}
        </div>
      </ViewerMeasurementSection>
      <ViewerMeasurementSection label={t("menu.cutDiameter")} legendAction={help(t("placement.diameterHelp"), <p>{t("placement.diameterTip")}</p>)}>
        <label htmlFor={`${id}-diameter`} className="sr-only">{t("placement.diameter")}</label>
        <form className="flex items-center gap-1" onSubmit={event => {
          event.preventDefault()
          if (!canEdit || !diameterEdited) return
          const text = diameter.trim().replace(",", ".")
          const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ? Number(text) : NaN
          const result = Number.isFinite(number) && number > 0 ? onDiameterChange(number) : "invalid"
          setError(result === "available" ? null : result)
        }}>
          <Input id={`${id}-diameter`} type="text" inputMode="decimal" maxLength={32} disabled={!canEdit}
            value={previewDiameterMm === undefined ? diameter : formatDiameter(previewDiameterMm)} onChange={event => { setDiameter(event.target.value); setDiameterEdited(true); setError(null) }} aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined} className="font-data text-xs text-white"
            wrapperClassName="h-8 min-w-0 border-white/20 bg-white/5 focus-within:border-white/50" />
          <TooltipHint {...viewerTooltipProps(boundary)} content={t("placement.applyDiameter")}><button type="submit" aria-label={t("placement.applyDiameter")} disabled={!canEdit || !diameterEdited || !diameter.trim()}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-token-sm)] text-[var(--color-sage-500)] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-40"><Check aria-hidden="true" className="size-3.5" /></button></TooltipHint>
        </form>
        {error ? <p role="alert" className="text-[11px] leading-4 text-[var(--color-coral-500)]" id={`${id}-error`}>{t(error === "invalid" ? "viewer.diameterInvalid" : "viewer.diameterOutside")}</p> : null}
        {fragmentMissing ? <p role="status" className="sr-only">{t("placement.fragmentMissing")}</p> : null}
      </ViewerMeasurementSection>
    </> : null}
    {children}
    {readFailure ? <div className="space-y-1 px-3 py-2.5">
      <p role="status" className="text-[11px] leading-4 text-white/70">{t("readErrorDescription")}</p>
        <ViewerMeasurementAction boundary={boundary} label={t("read.retry")} description={t("read.retryTip")}
          disabled={!readFailure.canRetry} onClick={readFailure.onRetry} icon={<RefreshCw aria-hidden="true" />} />
    </div> : null}
    {footerAction}
    </ViewerMeasurementCard>
  </div>
}

export { CaseImageTploCutControls }
