"use client"

import { useFormatter, useTranslations } from "next-intl"
import { useId, type ReactNode } from "react"

import { formatAngleDegrees } from "../lib/angle-format"
import { formatDistanceLength } from "../lib/distance-format"
import type { SavedLandmarks } from "../lib/landmarks-result"
import type { LandmarksPreview } from "../lib/landmarks-preview"
import { CaseImageLandmarksDetails } from "./case-image-landmarks-details"

// Official and estimated values share formatting, never result ownership.
// Tolerance/clinical metadata belongs only to the confirmed saved set.
function CaseImageLandmarksValues({ saved, readUnverified = false, loading = false, preview, compact = false, emptyAction, readFailure }: {
  saved: SavedLandmarks | null; readUnverified?: boolean; loading?: boolean; preview?: LandmarksPreview | null
  compact?: boolean; emptyAction?: ReactNode
  readFailure?: { canRetry: boolean; onRetry: () => void }
}) {
  const t = useTranslations("cases.workspace.landmarks"), format = useFormatter(), id = useId()
  if (!saved && !preview) return <section aria-busy={loading || undefined} aria-label={t("entryTitle")}
    className="w-56 max-w-full space-y-2 rounded-[var(--radius-token-md)] bg-[var(--color-obsidian)] p-3 text-xs text-white/70">
    <h3 className="font-medium text-white">{t("entryTitle")}</h3>
    <p role="status">{t(loading ? "loadingSaved" : readUnverified ? "readUnavailable" : "empty")}</p>
    {readUnverified && readFailure ? <button type="button" disabled={!readFailure.canRetry} onClick={readFailure.onRetry}
      className="min-h-9 w-full rounded-[var(--radius-token-sm)] bg-white/10 px-3 text-left text-xs text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40">
      {t("placement.readAgain")}
    </button> : null}
    {!loading && !readUnverified ? emptyAction : null}
  </section>
  const result = saved?.result, assessment = saved?.assessment
  const rows = preview ? ([
    { key: "tpa", value: preview.values?.tpaDegrees, format: formatAngleDegrees },
    { key: "plateauLength", value: preview.values?.plateauLengthMm, format: formatDistanceLength },
    { key: "tibialAxisLength", value: preview.values?.tibialAxisLengthMm, format: formatDistanceLength },
  ] as const).map(row => ({ key: row.key, value: row.value != null ? t("previewValueFormatted", { value: row.format(row.value, format.number) }) : "—",
    available: row.value != null, description: t(row.value != null ? "previewValue" : "previewPending"), source: "preview" })) : result ? ([
    { key: "tpa", result: result.tpa, value: result.tpa.status === "available" ? formatAngleDegrees(result.tpa.degrees, format.number) : "—" },
    { key: "plateauLength", result: result.plateauLength, value: result.plateauLength.status === "available" ? formatDistanceLength(result.plateauLength.mm, format.number) : "—" },
    { key: "tibialAxisLength", result: result.tibialAxisLength, value: result.tibialAxisLength.status === "available" ? formatDistanceLength(result.tibialAxisLength.mm, format.number) : "—" },
  ] as const).map(row => ({ key: row.key, value: row.value, available: row.result.status === "available",
    description: row.result.status === "available" ? t("officialValue") : t(`unavailableReasons.${row.result.reason}`),
    source: row.result.status === "available" ? "official" : "unavailable" })) : []
  const verifiedAssessment = !preview && result?.tpa.status === "available" && assessment?.method === saved?.landmarks.method ? assessment : null
  const comparison = verifiedAssessment?.acceptance === "PASS" || verifiedAssessment?.acceptance === "FAIL" ? verifiedAssessment : null
  const method = saved?.landmarks.method, [tpa, ...lengths] = rows
  const lengthNotes = [...new Set(lengths.filter(row => !row.available).map(row => row.description))]
  const showValueDescription = tpa?.source === "unavailable" || Boolean(preview && !preview.values)

  return <section aria-labelledby={`${id}-title`} className={compact ? "min-w-0 text-white" : "max-h-96 w-64 max-w-full overflow-y-auto overscroll-contain rounded-[var(--radius-token-md)] bg-[var(--color-obsidian)] px-2 py-2 text-white"}
    data-landmarks-saved-revision={!preview ? saved?.revision : undefined} data-landmarks-preview={preview ? true : undefined}>
    <h3 className="sr-only" id={`${id}-title`}>{t(preview ? "draftTitle" : "savedTitle")}</h3>
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-[var(--radius-token-sm)] bg-white/10 px-2 py-1.5">
      {tpa ? <dl className="font-data text-xs font-medium tabular-nums" data-landmarks-result="tpa" data-landmarks-value-source={tpa.source}>
        <dt className="sr-only">{t("values.tpa")}</dt><dd>{tpa.value}</dd>
      </dl> : null}
      <p className="text-[10px] text-white/70" role="status">{t(preview ? "state.unsaved" : readUnverified ? "state.unverified" : "state.saved")}</p>
    </div>
    {tpa && tpa.source !== "official" ? <p className={showValueDescription ? "mt-1 text-[10px] leading-4 text-white/70" : "sr-only"}>{tpa.description}</p> : null}
    {verifiedAssessment?.acceptance === "FAIL" ? <p className="mt-2 text-[11px] text-[var(--color-coral-500)]" role="status">{t("assessment.FAIL")}</p> : null}
    {!preview ? <p className="mt-1 text-[10px] leading-4 text-white/60">{t("assessment.notClinicallyValidated")}</p> : null}
    {readUnverified && readFailure ? <button type="button" disabled={!readFailure.canRetry} onClick={readFailure.onRetry}
      className="mt-2 min-h-9 w-full rounded-[var(--radius-token-sm)] bg-white/10 px-2 text-left text-[11px] text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40">
      {t("placement.readAgain")}
    </button> : null}
    {!compact && method ? <p className="mt-2 text-[10px] text-white/65">{t("method.current", { method: t(`methodShort.${method}`) })}</p> : null}
    <div className="mt-2">
      <CaseImageLandmarksDetails title={t("measurementDetails")} divider={false}>
        <dl className="space-y-1.5">
          {lengths.map(row => <div className="grid grid-cols-[1fr_auto] items-baseline gap-2" key={row.key}
            data-landmarks-result={row.key} data-landmarks-value-source={row.source}>
            <dt>{t(`values.${row.key}`)}</dt>
            <dd className="font-data whitespace-nowrap tabular-nums text-white">{row.value}</dd>
          </div>)}
        </dl>
        {lengthNotes.map(note => <p key={note} className="mt-1 text-[10px] leading-4 text-white/65">{note}</p>)}
        {comparison ? <section aria-labelledby={`${id}-assessment`} className="mt-2 space-y-0.5 border-t border-white/15 pt-2 text-[10px] leading-4 text-white/70">
          <h4 className="font-medium" id={`${id}-assessment`}>{t("assessment.title")}</h4>
          {comparison.acceptance === "PASS" ? <p>{t("assessment.PASS")}</p> : null}
          {comparison.reference_tpa_degrees != null ? <p>{t("assessment.reference", { value: formatAngleDegrees(comparison.reference_tpa_degrees, format.number) })}</p> : null}
          {comparison.tpa_absolute_error_degrees != null ? <p>{t("assessment.error", { value: formatAngleDegrees(comparison.tpa_absolute_error_degrees, format.number) })}</p> : null}
          {comparison.tpa_max_absolute_error_degrees != null ? <p>{t("assessment.tolerance", { value: formatAngleDegrees(comparison.tpa_max_absolute_error_degrees, format.number) })}</p> : null}
        </section> : null}
      </CaseImageLandmarksDetails>
    </div>
  </section>
}

export { CaseImageLandmarksValues }
