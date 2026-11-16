"use client"

import { CircleAlert, LockKeyhole } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useId } from "react"

import { formatDistanceLength as formatCircleLength } from "../lib/distance-format"
import { DEFAULT_CIRCLE_MEASURE, circleMeasureFor, isCircleValues, type CircleMeasure, type SavedCircle } from "../lib/circle-result"
import type { CirclePreview } from "../lib/circle-preview"

function CaseImageCircleValues({ circles, selectedId, selectionDisabled, onSelect, measure = DEFAULT_CIRCLE_MEASURE, measures, creating = false, preview }: {
  circles: readonly SavedCircle[]; selectedId: string | null; selectionDisabled: boolean; onSelect: (id: string) => void; measure?: CircleMeasure
  measures?: Readonly<Record<string, CircleMeasure>>; creating?: boolean; preview?: CirclePreview | null
}) {
  const t = useTranslations("cases.workspace.circle"), format = useFormatter(), id = useId()
  if (creating && !circles.length && !preview) return null
  const previewMeasure = preview ? circleMeasureFor(preview.id, measures, measure) : measure

  return <ul aria-label={t("list")} className="max-h-44 w-full min-w-0 overflow-y-auto text-white">
    {circles.map(({ circle, result, ambiguous }, index) => {
      const itemMeasure = circleMeasureFor(circle.id, measures, measure)
      const ambiguousPlan = result.status === "unavailable" && result.reason === "ambiguous"
      const draft = !ambiguousPlan && !ambiguous && preview?.id.toLowerCase() === circle.id.toLowerCase() ? preview : null
      const selected = !ambiguous && circle.id.toLowerCase() === selectedId?.toLowerCase()
      const name = circle.label?.trim() || t("defaultName", { index: index + 1 })
      const value = draft ? isCircleValues(draft.values) ? t("previewLength", { value: formatCircleLength(draft.values[itemMeasure], format.number) }) : t("previewPending")
        : result.status === "available" ? formatCircleLength(result.values[itemMeasure], format.number) : "—"
      const description = draft ? t("previewValue") : result.status === "available" ? t("officialValue") : t(`unavailableReasons.${result.reason}`)
      return <li key={`${circle.id}:${index}`}>
        <button aria-pressed={selected} aria-labelledby={`${id}-${index}-name ${id}-${index}-measure ${id}-${index}-value`}
          aria-describedby={`${id}-${index}-status`}
          className="flex min-h-8 w-full items-center justify-start gap-2 rounded-[var(--radius-token-sm)] px-2 font-data text-xs font-medium tabular-nums outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 aria-pressed:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          data-circle-row={circle.id} data-circle-ambiguous={ambiguous} data-circle-measure={itemMeasure}
          data-circle-value-source={draft ? "preview" : result.status === "available" ? "official" : "unavailable"}
          disabled={selectionDisabled || ambiguous} onClick={() => { if (!selected) onSelect(circle.id) }} type="button"
          title={`${name}. ${t(`measures.${itemMeasure}`)} ${value}. ${description}${circle.locked ? ` ${t("locked")}` : ""}`}>
          <span className="sr-only" id={`${id}-${index}-name`}>{name}</span>
          <span className="sr-only" id={`${id}-${index}-measure`}>{t(`measures.${itemMeasure}`)}</span>
          <span className="truncate" id={`${id}-${index}-value`}>{value}</span>
          {circle.locked ? <LockKeyhole aria-hidden="true" className="size-3 shrink-0" /> : null}
          {ambiguousPlan ? <CircleAlert aria-hidden="true" className="size-3 shrink-0" /> : null}
          <span className="sr-only" id={`${id}-${index}-status`}>{description}{circle.locked ? ` ${t("locked")}` : ""}</span>
        </button>
      </li>
    })}
    {!circles.length && !preview ? <li className="px-2 py-2 text-xs text-white/70" role="status">{t("empty")}</li> : null}
    {preview && !circles.some(item => item.circle.id.toLowerCase() === preview.id.toLowerCase()) ? <li
      className="px-2 py-2 font-data text-[11px] tabular-nums" data-circle-measure={previewMeasure} data-circle-value-source="preview">
      <span className="sr-only">{t(`measures.${previewMeasure}`)} </span>
      {isCircleValues(preview.values) ? t("previewLength", { value: formatCircleLength(preview.values[previewMeasure], format.number) }) : t("previewPending")}
      <span className="sr-only"> {t("previewValue")}</span>
    </li> : null}
  </ul>
}

export { CaseImageCircleValues }
