"use client"

import { LockKeyhole } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useId } from "react"

import { formatAngleDegrees } from "../lib/angle-format"
import { isAngleDegrees, type SavedAngle } from "../lib/angle-result"
import type { AnglePreview } from "../lib/angle-preview"

function CaseImageAngleValues({ angles, selectedId, selectionDisabled, onSelect, preview, placing = false }: {
  angles: readonly SavedAngle[]; selectedId: string | null; selectionDisabled: boolean; onSelect: (id: string) => void; preview?: AnglePreview | null; placing?: boolean
}) {
  const t = useTranslations("cases.workspace.angle"), format = useFormatter(), id = useId()
  if (placing && !angles.length && !preview) return null
  return <ul aria-label={t("list")} className="max-h-44 w-full min-w-0 overflow-y-auto text-white">
    {angles.map(({ angle, result }, index) => {
      const draft = preview?.id.toLowerCase() === angle.id.toLowerCase() ? preview : null
      const selected = angle.id.toLowerCase() === selectedId?.toLowerCase()
      const name = angle.label?.trim() || t("defaultName", { index: index + 1 })
      const value = draft ? isAngleDegrees(draft.degrees) ? t("previewDegrees", { value: formatAngleDegrees(draft.degrees, format.number) }) : t("previewPending")
        : result.status === "available" ? formatAngleDegrees(result.degrees, format.number) : "—"
      const description = draft ? t("previewValue") : result.status === "available" ? t("officialValue") : t(`unavailableReasons.${result.reason}`)
      return <li key={`${angle.id}:${index}`}>
        <button aria-pressed={selected} aria-labelledby={`${id}-${index}-name ${id}-${index}-value`} aria-describedby={`${id}-${index}-status`}
          className="flex min-h-8 w-full items-center justify-start gap-2 rounded-[var(--radius-token-sm)] px-2 font-data text-xs font-medium tabular-nums outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 aria-pressed:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          data-angle-row={angle.id} data-angle-value-source={draft ? "preview" : result.status === "available" ? "official" : "unavailable"}
          disabled={selectionDisabled} onClick={() => { if (!selected) onSelect(angle.id) }} type="button"
          title={`${name}: ${value}. ${description}${angle.locked ? ` ${t("locked")}` : ""}`}>
          <span className="sr-only" id={`${id}-${index}-name`}>{name}</span><span className="truncate" id={`${id}-${index}-value`}>{value}</span>
          {angle.locked ? <LockKeyhole aria-hidden="true" className="size-3 shrink-0" /> : null}
          <span className="sr-only" id={`${id}-${index}-status`}>{description}{angle.locked ? ` ${t("locked")}` : ""}</span>
        </button>
      </li>
    })}
    {!angles.length && !preview ? <li className="px-2 py-2 text-xs text-white/70" role="status">{t("empty")}</li> : null}
    {!angles.some(item => item.angle.id.toLowerCase() === preview?.id.toLowerCase()) && preview ? <li className="px-2 py-2 font-data text-[11px] tabular-nums" data-angle-value-source="preview">
      {isAngleDegrees(preview.degrees) ? t("previewDegrees", { value: formatAngleDegrees(preview.degrees, format.number) }) : t("previewPending")}<span className="sr-only">{t("previewValue")}</span>
    </li> : null}
  </ul>
}

export { CaseImageAngleValues }
