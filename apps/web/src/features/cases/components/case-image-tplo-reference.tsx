"use client"

import { useFormatter, useLocale, useTranslations } from "next-intl"

import type { TploTableConsultation } from "../hooks/use-tplo-table-consultation"
import { formatAngleDegrees } from "../lib/angle-format"
import { formatDistanceLength } from "../lib/distance-format"
import { tploTableMatch, type TploCorrectionRead } from "../lib/tplo-correction"
import { CaseImageLandmarksDetails } from "./case-image-landmarks-details"
import { CaseImageLandmarksProtocol } from "./case-image-landmarks-protocol"
import { ViewerMeasurementAction } from "./viewer-measurement-card"
import { useViewerBoundary } from "./viewer-tool-action"

function CaseImageTploReference({ table, correction, canEdit, onEdit }: {
  table: TploTableConsultation; correction: TploCorrectionRead; canEdit: boolean; onEdit?: () => void
}) {
  const t = useTranslations("cases.workspace.tplo.table"), format = useFormatter(), locale = useLocale(), { boundary, ref } = useViewerBoundary()
  const exact = (value: number) => String(value).replace(".", locale.startsWith("pt") ? "," : ".")
  const data = table.state?.phase === "done" ? table.state.data : undefined
  const match = data && table.filters ? tploTableMatch(data, table.filters) : null
  const error = table.state?.error
  return <div ref={ref} data-tplo-reference>
    {onEdit ? <div className="border-t border-white/10 p-2"><ViewerMeasurementAction boundary={boundary} label={t("edit")} disabled={!canEdit} onClick={onEdit} /></div> : null}
    <CaseImageLandmarksDetails title={t("title")}>
      <div className="space-y-2 break-words text-[11px] leading-4">
        <p>{t("global")}</p>
        <p>{t(table.parameterPreview ? "parameterPreview" : "savedParameters")}</p>
        <p>{table.filters ? t("filters", { tpa: `${exact(table.filters.tpa_degrees)}°`, blade: `${exact(table.filters.blade_diameter_mm)} mm` }) : t("prerequisites")}</p>
        <ViewerMeasurementAction boundary={boundary} label={t("consult")} disabled={!table.canConsult} loading={table.state?.phase === "loading"} onClick={() => void table.consult()} />
        {table.state?.phase === "error" ? <p role="status">{t(error === "SESSION_UNAVAILABLE" || error === "CLINICAL_CONTEXT_CHANGED" || error === "CLINICAL_ORGANIZATION_REQUIRED" ? "session" : error === "ACCESS_DENIED" ? "denied" : "error")}</p>
          : match ? <p role="status">{match.status === "match" ? t("match", { value: formatDistanceLength(match.rotationMm, format.number) }) : t(match.status)}</p> : null}
        {data?.target_slope_degrees != null && table.target !== null && data.target_slope_degrees !== table.target ? <p role="status">{t("targetMismatch")}</p> : null}
        {data ? <dl className="space-y-1 text-[10px] text-white/65">
          {data.table_version ? <div><dt>{t("version")}</dt><dd>{data.table_version}</dd></div> : null}
          {data.source ? <div><dt>{t("source")}</dt><dd>{data.source}</dd></div> : null}
          {data.target_slope_degrees != null ? <div><dt>{t("target")}</dt><dd>{formatAngleDegrees(data.target_slope_degrees, format.number)}</dd></div> : null}
          {data.entries_sha256 ? <div><dt>{t("checksum")}</dt><dd className="break-all font-data">{data.entries_sha256}</dd></div> : null}
        </dl> : null}
        <p className="text-[10px] text-white/65">{t("noRecommendation")}</p>
      </div>
    </CaseImageLandmarksDetails>
    <CaseImageLandmarksDetails title={t("correctionTitle")}>
      <div data-tplo-correction-source="official" className="space-y-1 break-words text-[11px] leading-4">
        {correction.status === "available" ? <>
          <p>{t("revision", { revision: correction.revision })}</p>
          <p>{t(`states.${correction.correction.status}`)}</p>
          {correction.correction.status === "CALCULATED" ? <p className="font-data text-xs text-white">{t("displacement", { value: formatDistanceLength(correction.correction.rotation_mm!, format.number) })}</p> : null}
          {correction.correction.table_version ? <p>{t("correctionVersion", { version: correction.correction.table_version })}</p> : null}
        </> : <p>{t(`unavailable.${correction.reason}`)}</p>}
        <p className="text-[10px] text-white/65">{t("notValidated")}</p>
      </div>
    </CaseImageLandmarksDetails>
    <CaseImageLandmarksProtocol data={table.protocol.isError ? undefined : table.protocol.data} loading={table.protocol.isFetching}
      error={table.protocol.isError} canRetry={table.canReadProtocol} onRetry={table.refreshProtocol} />
  </div>
}

export { CaseImageTploReference }
