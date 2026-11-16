"use client"

import { useFormatter, useTranslations } from "next-intl"
import { useId } from "react"

import { toast } from "@/lib/notifications"
import { ViewerMeasurementAction, ViewerMeasurementSection } from "./viewer-measurement-card"

const PRESET_DEGREES = [30, 45, 60, 90, 135, 180] as const

function CaseImageAngleValueControl({ enabled, currentDegrees, onApply, boundary }: {
  enabled: boolean; currentDegrees: number | null; boundary: HTMLElement | null
  onApply: (degrees: number) => boolean
}) {
  const t = useTranslations("cases.workspace.angle.valueControl"), format = useFormatter(), descriptionId = useId()

  function apply(degrees: number) {
    if (!enabled) return
    if (!onApply(degrees)) toast.error(t("error"), { description: t("unavailable") })
  }

  return <ViewerMeasurementSection label={t("presets")}>
    <p id={descriptionId} className="sr-only">{t("description")}</p>
    <div className="grid grid-cols-3 gap-1" role="group" aria-label={t("presets")} aria-describedby={descriptionId}>
      {PRESET_DEGREES.map(degrees => {
        const label = format.number(degrees, { style: "unit", unit: "degree", unitDisplay: "narrow", maximumFractionDigits: 0 })
        return <ViewerMeasurementAction key={degrees} boundary={boundary} label={label} aria-label={t("preset", { value: label })}
          disabled={!enabled} active={currentDegrees !== null && Math.abs(currentDegrees - degrees) <= 1e-8}
          className="justify-center font-data tabular-nums" onClick={() => apply(degrees)} />
      })}
    </div>
  </ViewerMeasurementSection>
}

export { CaseImageAngleValueControl }
