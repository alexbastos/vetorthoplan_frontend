"use client"

import { useFormatter, useTranslations } from "next-intl"

import { formatAngleDegrees } from "../lib/angle-format"
import { formatDistanceLength } from "../lib/distance-format"
import type { TploPreview } from "../lib/tplo-preview"
import type { TploMeasurementResult } from "../lib/tplo-result"

function CaseImageTploValues({ measurement, source }: {
  measurement: TploMeasurementResult | TploPreview["measurement"] | undefined; source: "preview" | "official" | "unavailable"
}) {
  const t = useTranslations("cases.workspace.tplo"), format = useFormatter()
  const value = measurement?.status === "available" ? measurement : null
  const approximate = source === "preview" ? "≈ " : ""
  const reason = measurement?.status === "unavailable" ? measurement.reason : "missing"
  const sourceText = t(source === "preview" ? "simulation.preview" : source === "official" ? "simulation.official" : "read.unavailable")
  return <div className="min-w-0">
    <dl data-tplo-values data-tplo-value-source={source} className="space-y-1 font-data text-xs font-medium tabular-nums text-white">
      <div className="flex min-h-8 items-center justify-between gap-2 rounded-[var(--radius-token-sm)] bg-white/10 px-2 py-1.5"><dt>{t("geometry.diameter")}</dt><dd className="shrink-0">{value ? `${approximate}${formatDistanceLength(value.radiusMm * 2, format.number)}` : "—"}</dd></div>
      <div className="flex min-h-8 items-center justify-between gap-2 rounded-[var(--radius-token-sm)] px-2 py-1.5"><dt>{t("simulation.rotation")}</dt><dd className="shrink-0"><output data-tplo-rotation-value data-tplo-result-source={source}>{value ? `${approximate}${formatAngleDegrees(value.rotationDegrees, format.number)}` : "—"}</output></dd></div>
    </dl>
    <p role="status" className={source === "unavailable" ? "mt-1 text-[10px] leading-4 text-white/65" : "sr-only"}>{sourceText}</p>
    {!value ? <p className="mt-1 text-[10px] leading-4 text-white/65">{t(reason === "incomplete" ? "simulation.incomplete" : `read.reasons.${reason}`)}</p> : null}
  </div>
}

export { CaseImageTploValues }
