"use client"

import { Circle, Crosshair, MoveHorizontal, RefreshCw, Scissors, TriangleRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Tooltip } from "radix-ui"
import { useId } from "react"

import { Button } from "@/components/ui/button"
import { CasePanelChoice } from "./case-panel-choice"

function CaseImageToolsPanel({ openDisabled, onOpen, readError, canRetryRead, onRetryRead, loading, distanceActive, angleActive = false, circleActive = false, angleEntry, circleEntry, savedCircleEntry, landmarksEntry, landmarksActive = false, tploActive = false, tploEntry }: {
  openDisabled: boolean; onOpen: () => void
  readError: boolean; canRetryRead: boolean; onRetryRead: () => void; loading: boolean; distanceActive: boolean; angleActive?: boolean; circleActive?: boolean
  angleEntry?: { disabled: boolean; onOpen: () => void }
  circleEntry?: { disabled: boolean; onOpen: () => void }
  savedCircleEntry?: { disabled: boolean; onOpen: () => void }
  landmarksEntry?: { disabled: boolean; onOpen: () => void }
  landmarksActive?: boolean
  tploActive?: boolean; tploEntry?: { disabled: boolean; onOpen: () => void }
}) {
  const t = useTranslations("cases.workspace.tools")
  const tDistance = useTranslations("cases.workspace.distance")
  const tLandmarks = useTranslations("cases.workspace.landmarks")
  const tTplo = useTranslations("cases.workspace.tplo")
  const id = useId()
  return <section aria-labelledby={`${id}-measurements`} className="space-y-3">
    <h3 className="font-data text-[11px] font-medium" id={`${id}-measurements`}>{t("measurements")}</h3>
    <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={`${id}-measurements`}>
      <Tooltip.Provider delayDuration={200}><Tooltip.Root><Tooltip.Trigger asChild>
      <CasePanelChoice aria-describedby={readError ? id : undefined} aria-disabled={readError ? !canRetryRead : undefined} active={distanceActive}
        className={readError ? "border-destructive text-destructive" : undefined} label={tDistance(readError ? "readAgain" : "title")}
        data-distance-tool disabled={!readError && openDisabled && !distanceActive}
        onClick={() => { if (readError) { if (canRetryRead) onRetryRead() } else if (!openDisabled) onOpen() }}>
        {readError ? <RefreshCw aria-hidden="true" /> : <MoveHorizontal aria-hidden="true" />}
      </CasePanelChoice>
      </Tooltip.Trigger>{readError ? <>
        <span className="sr-only" id={id}>{tDistance("readErrorDescription")}</span>
        <Tooltip.Portal><Tooltip.Content className="z-50 max-w-[min(18rem,calc(100vw-2rem))] rounded-[var(--radius-token-md)] border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground shadow-[var(--shadow-elevated)]"
          collisionPadding={16} side="right" sideOffset={6}>{tDistance("readErrorDescription")}</Tooltip.Content></Tooltip.Portal>
      </> : null}</Tooltip.Root></Tooltip.Provider>
      <CasePanelChoice active={angleActive} aria-disabled={angleEntry?.disabled ?? true} data-angle-tool label={t("catalog.angle")}
        disabled={!angleActive && (angleEntry?.disabled ?? true)}
        onClick={() => { if (angleEntry && !angleEntry.disabled) angleEntry.onOpen() }}>
        <TriangleRight aria-hidden="true" />
      </CasePanelChoice>
      <CasePanelChoice active={circleActive} aria-disabled={circleEntry?.disabled ?? true} data-circle-tool disabled={!circleActive && (circleEntry?.disabled ?? true)}
        label={t("catalog.circle")}
        onClick={() => { if (circleEntry && !circleEntry.disabled) circleEntry.onOpen() }}>
        <Circle aria-hidden="true" />
      </CasePanelChoice>
    </div>
    <div className="space-y-2 border-t border-border pt-3">
      <h3 className="font-data text-[11px] font-medium" id={`${id}-planning`}>{t("planning")}</h3>
      <div className="space-y-2" role="group" aria-labelledby={`${id}-planning`}>
        <CasePanelChoice active={landmarksActive} disabled={landmarksEntry?.disabled ?? true} aria-disabled={landmarksEntry?.disabled ?? true}
          data-landmarks-tool label={tLandmarks("entryTitle")} className="w-full"
          onClick={() => { if (landmarksEntry && !landmarksEntry.disabled) landmarksEntry.onOpen() }}><Crosshair aria-hidden="true" /></CasePanelChoice>
        <CasePanelChoice active={tploActive} disabled={tploEntry?.disabled ?? true} aria-disabled={tploEntry?.disabled ?? true}
          data-tplo-tool label={tTplo("title")} className="w-full"
          onClick={() => { if (tploEntry && !tploEntry.disabled) tploEntry.onOpen() }}><Scissors aria-hidden="true" /></CasePanelChoice>
      </div>
    </div>
    {loading ? <p aria-busy="true" className="sr-only" role="status">{tDistance("loadingSaved")}</p> : null}
    {savedCircleEntry ? <div className="border-t border-border pt-3">
      <Button className="h-auto min-h-8 w-full justify-between whitespace-normal rounded-[var(--radius-token-md)] px-2 text-left text-[12px] font-normal"
        disabled={savedCircleEntry.disabled} size="sm" type="button" variant="ghost" onClick={savedCircleEntry.onOpen}>
        <span>{t("savedCircles")}</span><Circle aria-hidden="true" />
      </Button>
    </div> : null}
  </section>
}

export { CaseImageToolsPanel }
