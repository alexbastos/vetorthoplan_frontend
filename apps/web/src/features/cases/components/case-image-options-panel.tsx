"use client"

import { Contrast, FlipHorizontal2, RefreshCw, Ruler, Sun } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useId, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { ImageCalibrationState } from "../hooks/use-image-calibration"
import type { ImageDisplayState } from "../hooks/use-image-display-settings"

function CaseImageOptionsPanel({ calibration: c, display, onCalibrate }: {
  calibration: ImageCalibrationState; display: ImageDisplayState; onCalibrate: () => void
}) {
  const t = useTranslations("cases.workspace.image"), tCalibration = useTranslations("cases.workspace.calibration")
  const locale = useLocale(), id = useId()
  const { settings } = display
  const result = c.plan?.document.calibration?.result
  const reading = c.planQuery.isPending || c.planQuery.isFetching
  const verified = !reading && !c.planQuery.isError && Boolean(result)

  return <div className="flex min-w-0 flex-1 flex-col gap-5">
    <section aria-label={t("calibration")} className="flex flex-col gap-1">
      <h3 className="font-data text-[11px] font-medium">{t("calibration")}</h3>
      {reading ? <p aria-busy="true" className="text-[12px] text-content-secondary" role="status">{tCalibration("remote.loading")}</p>
        : c.planQuery.isError ? <div className="space-y-2" role="alert"><p className="text-[12px] leading-5 text-destructive">{tCalibration("remote.readError")}</p>
          <Button disabled={c.locked || c.deleting} onClick={c.refresh} size="sm" variant="secondary"><RefreshCw aria-hidden="true" />{tCalibration("remote.retry")}</Button></div>
          : null}
      <Button aria-label={t(verified ? "recalibrate" : "calibrate")} className="h-[1.875rem] w-full justify-between rounded-[var(--radius-token-md)] px-2 text-[12px] font-normal" disabled={!c.canEdit} onClick={onCalibrate} size="sm" title={t(verified ? "recalibrate" : "calibrate")} type="button" variant="ghost">
        {verified && result ? <output aria-label={tCalibration("savedScale")} className="font-data text-[12px] tabular-nums">{new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }).format(result.mm_per_pixel)} mm/px</output> : <span>{t("calibrate")}</span>}
        <Ruler aria-hidden="true" />
      </Button>
      <Button aria-pressed={settings.mirrored} className={`h-[1.875rem] w-full justify-between rounded-[var(--radius-token-md)] px-2 text-[12px] font-normal ${settings.mirrored ? "bg-[var(--color-surface-selected)]" : ""}`} disabled={c.deleting} onClick={() => display.setMirrored(!settings.mirrored)} size="sm" type="button" variant="ghost">
        <span>{t("mirror")}</span>
        <FlipHorizontal2 aria-hidden="true" />
      </Button>
      {c.issue ? <p className="text-[11px] leading-4 text-content-secondary" role="status">{tCalibration(c.issue === "anisotropy" ? "remote.anisotropy" : "remote.dimensions")}</p> : null}
      {c.otherIntent ? <p className="text-[11px] leading-4 text-content-secondary" role="status">{tCalibration("remote.otherEdit")}</p> : null}
    </section>
    <section aria-labelledby={`${id}-display`} className="space-y-3">
      <h3 className="font-data text-[11px] font-medium" id={`${id}-display`}>{t("display")}</h3>
      <LevelControl icon={<Sun aria-hidden="true" className="size-3.5" />} id={`${id}-brightness`} label={t("brightness")} onChange={value => display.setLevel("brightness", value)} value={settings.brightness} />
      <LevelControl icon={<Contrast aria-hidden="true" className="size-3.5" />} id={`${id}-contrast`} label={t("contrast")} onChange={value => display.setLevel("contrast", value)} value={settings.contrast} />
      <DisplayToggle checked={settings.inverted} label={t("invert")} onChange={display.setInverted} />
    </section>
  </div>
}

function LevelControl({ icon, id, label, value, onChange }: { icon: ReactNode; id: string; label: string; value: number; onChange: (value: number) => void }) {
  return <div className="space-y-1">
    <div className="flex items-center justify-between gap-2 text-[12px]"><label className="flex items-center gap-2 text-content-secondary" htmlFor={id}>{icon}{label}</label><output className="font-data text-[11px] tabular-nums">{value}%</output></div>
    <input aria-valuetext={`${value}%`} className="h-5 w-full cursor-pointer accent-[var(--case-progress-label-active)] outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring" id={id} max={200} min={0} onChange={event => onChange(Number(event.target.value))} step={1} type="range" value={value} />
  </div>
}

function DisplayToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-3">
    <span className="text-[12px] text-content-secondary">{label}</span>
    <button aria-checked={checked} aria-label={label} className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${checked ? "border-[var(--case-progress-label-active)] bg-[var(--case-progress-label-active)]" : "border-border bg-muted"}`}
      onClick={() => onChange(!checked)} role="switch" type="button"><span aria-hidden="true" className={`absolute top-1/2 left-0.5 size-3.5 -translate-y-1/2 rounded-full transition-transform motion-reduce:transition-none ${checked ? "translate-x-4 bg-white" : "bg-[var(--color-icon-active-default)]"}`} /></button>
  </div>
}

export { CaseImageOptionsPanel }
