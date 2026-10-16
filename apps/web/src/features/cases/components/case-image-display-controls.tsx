"use client"

import { useTranslations } from "next-intl"

type CaseImageDisplayControlsProps = {
  brightness: number
  contrast: number
  inverted: boolean
  onBrightnessChange: (value: number) => void
  onContrastChange: (value: number) => void
  onInvertedChange: (value: boolean) => void
}

function CaseImageDisplayControls({ brightness, contrast, inverted, onBrightnessChange, onContrastChange, onInvertedChange }: CaseImageDisplayControlsProps) {
  const t = useTranslations("cases.workspace.calibration")
  const tPanel = useTranslations("cases.workspace.panel")

  return (
    <section className="mt-5 border-t border-border pt-4">
      <h2 className="font-data text-[11px] font-medium text-description uppercase">{t("displayTitle")}</h2>
      <RangeControl label={t("brightness")} onChange={onBrightnessChange} value={brightness} />
      <RangeControl label={t("contrast")} onChange={onContrastChange} value={contrast} />
      <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 border-t border-border pt-4 text-[12px] text-content-secondary">
        <span>{tPanel("invertColors")}</span>
        <input checked={inverted} className="size-4 accent-[var(--case-progress-label-active)]" onChange={(event) => onInvertedChange(event.target.checked)} type="checkbox" />
      </label>
    </section>
  )
}

function RangeControl({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return <label className="mt-4 block font-data text-[11px]"><span className="flex justify-between"><span className="text-content-secondary">{label}</span><span className="tabular-nums text-description">{value}%</span></span><input className="mt-2 w-full accent-[var(--case-progress-label-active)]" max="160" min="40" onChange={(event) => onChange(Number(event.target.value))} type="range" value={value} /></label>
}

export { CaseImageDisplayControls }
