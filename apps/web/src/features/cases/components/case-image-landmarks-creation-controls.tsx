"use client"

import { Check, Crosshair, RefreshCw, X } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { LANDMARK_POINT_NAMES, type LandmarksPointName } from "../lib/landmarks-editor"
import type { LandmarksPlacementState } from "../lib/landmarks-placement"
import { CaseImageLandmarksDetails } from "./case-image-landmarks-details"
import { CasePanelHelp } from "./case-panel-help"
import { useViewerBoundary } from "./viewer-tool-action"

function CaseImageLandmarksCreationControls({ placement, canPlace, marking, canCancel, onSelectPoint, onMark, onCancel, readFailure, protocol }: {
  placement: LandmarksPlacementState
  canPlace: boolean
  marking: boolean
  canCancel: boolean
  onSelectPoint: (name: LandmarksPointName) => void
  onMark: () => void
  onCancel: () => void
  readFailure?: { canRetry: boolean; onRetry: () => void }
  protocol?: ReactNode
}) {
  const t = useTranslations("cases.workspace.landmarks")
  const { boundary, ref } = useViewerBoundary()
  const placedCount = LANDMARK_POINT_NAMES.reduce((count, name) => count + (placement.landmarks[name] ? 1 : 0), 0)
  const medial = placement.landmarks.method === "MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1"
  const landmarkTip = medial && placement.activePoint === "plateau_cranial" ? t("placement.medialCranialTip")
    : medial && placement.activePoint === "plateau_caudal" ? t("placement.medialCaudalTip") : null

  return <section ref={ref} aria-label={t("placement.controls")}
    className="max-h-full w-64 max-w-full overflow-y-auto overscroll-contain rounded-[var(--radius-token-md)] border border-white/10 bg-[var(--color-obsidian)] text-white shadow-sm"
    data-landmarks-creation-controls>
    <header className="p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium" data-landmarks-placement-title>
          {t("entryTitle")} <span className="text-white/70">· {t(`methodShort.${placement.landmarks.method}`)}</span>
        </h3>
        <CasePanelHelp label={t("help")} portalContainer={boundary} className="text-white/70 hover:bg-white/10 hover:text-white">
          {landmarkTip ? <p>{landmarkTip}</p> : null}
          <p>{t("placement.helpTip")}</p>
        </CasePanelHelp>
      </div>
      <div className="mt-2" role="status">
        <p className="font-data text-[10px] text-white/70">{t("placement.step", { index: LANDMARK_POINT_NAMES.indexOf(placement.activePoint) + 1 })}</p>
        <p className="mt-1 text-xs font-medium">{t(`points.${placement.activePoint}`)}</p>
      </div>
      {canPlace && marking ? <p className="mt-1 text-[11px] leading-4 text-white/65">{t("placement.shortHint")}</p> : null}
      {canPlace && !marking ? <button type="button" onClick={onMark}
        className="mt-3 flex min-h-9 w-full items-center gap-2 rounded-[var(--radius-token-sm)] bg-white/10 px-2 text-left text-[11px] font-medium outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40">
        <Crosshair aria-hidden="true" className="size-4 shrink-0 text-[var(--color-sage-500)]" />{t("placement.resumeMarking")}
      </button> : null}
    </header>

    {placedCount > 0 ? <CaseImageLandmarksDetails title={t("placement.reviewPoints", { count: placedCount })}>
    <ol aria-label={t("placement.title")} className="space-y-1">
      {LANDMARK_POINT_NAMES.map((name, index) => {
        const placed = Boolean(placement.landmarks[name])
        const active = placement.activePoint === name
        const status = t(placed ? "placement.placed" : "placement.missing")
        return <li key={name}>
          <button type="button" disabled={!canPlace} aria-pressed={active}
            aria-label={`${index + 1}. ${t(`points.${name}`)}. ${status}`}
            className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-[var(--radius-token-sm)] px-2 py-1.5 text-left text-[11px] leading-4 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-white/15" : ""}`}
            data-landmarks-point-select={name} data-landmarks-point-status={placed ? "placed" : "missing"}
            onClick={() => onSelectPoint(name)}>
            <span className="min-w-0"><span className="mr-1.5 font-data text-white/60">{index + 1}.</span>{t(`points.${name}`)}</span>
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-white/70">
              {placed ? <Check aria-hidden="true" className="size-3 text-[var(--color-sage-500)]" /> : null}{status}
            </span>
          </button>
        </li>
      })}
    </ol>
    </CaseImageLandmarksDetails> : null}
    {protocol}

    <div className="space-y-1.5 border-t border-white/10 p-3">
      {readFailure ? <button type="button" disabled={!readFailure.canRetry} onClick={readFailure.onRetry}
        title={t("placement.readAgainTip")}
        className="flex min-h-8 w-full items-center gap-2 rounded-[var(--radius-token-sm)] px-2 text-left text-[10px] text-white/75 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40">
        <RefreshCw aria-hidden="true" className="size-3.5 shrink-0" />{t("placement.readAgain")}
      </button> : null}
      <button type="button" disabled={!canCancel} onClick={onCancel} title={t("placement.cancelTip")}
        className="flex min-h-8 w-full items-center gap-2 rounded-[var(--radius-token-sm)] px-2 text-left text-[10px] text-[var(--color-coral-500)] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-40">
        <X aria-hidden="true" className="size-3.5 shrink-0" />{t("placement.cancel")}
      </button>
    </div>
  </section>
}

export { CaseImageLandmarksCreationControls }
