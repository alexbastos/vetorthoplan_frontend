"use client"

import { useFormatter, useTranslations } from "next-intl"

import { formatAngleDegrees } from "../lib/angle-format"
import type { TploClinicalProtocol } from "../schemas/tplo-reference.schema"
import { ViewerMeasurementSection } from "./viewer-measurement-card"
import { CaseImageLandmarksDetails } from "./case-image-landmarks-details"

// Environment configuration is informational. The saved result retains its own
// protocol version/assessment; neither query loading nor configured=false gates TPA.
function CaseImageLandmarksProtocol({ data, loading, error, canRetry, onRetry }: {
  data?: TploClinicalProtocol; loading: boolean; error: boolean; canRetry: boolean; onRetry: () => void
}) {
  const t = useTranslations("cases.workspace.landmarks.protocol"), format = useFormatter()
  const content =
    <div aria-busy={loading || undefined} className="space-y-1 break-words text-[10px] leading-4 text-white/70">
      {error ? <><p role="status">{t("error")}</p><button type="button" disabled={!canRetry} onClick={onRetry}
        className="min-h-8 rounded-[var(--radius-token-sm)] px-2 text-left text-[11px] outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40">{t("retry")}</button></>
        : !data ? <p aria-busy={loading || undefined} role="status">{t(loading ? "loading" : "unavailable")}</p>
        : <>
          <p>{t(data.configured ? "configured" : "notConfigured")}</p>
          {data.protocol_version ? <p>{t("version", { version: data.protocol_version })}</p> : null}
          {data.configured ? <p>{data.tpa_max_absolute_error_degrees != null
            ? t("tolerance", { value: formatAngleDegrees(data.tpa_max_absolute_error_degrees, format.number) }) : t("noTpaTolerance")}</p> : null}
          <p>{t("independent")}</p>
          <button type="button" disabled={!canRetry} onClick={onRetry}
            className="min-h-8 rounded-[var(--radius-token-sm)] px-2 text-left text-[11px] outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40">{t("refresh")}</button>
        </>}
    </div>
  if (error) return <ViewerMeasurementSection label={t("title")}>{content}</ViewerMeasurementSection>
  return <CaseImageLandmarksDetails title={t("title")}>{content}</CaseImageLandmarksDetails>
}

export { CaseImageLandmarksProtocol }
