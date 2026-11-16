"use client"

import { Crosshair, RefreshCw, X } from "lucide-react"
import { useTranslations } from "next-intl"

import type { CirclePlacement } from "../lib/circle-editor"
import { VIEWER_TOOLBAR_CLASS_NAME } from "./viewer-toolbar"
import { useViewerBoundary, ViewerToolAction } from "./viewer-tool-action"

function CaseImageCircleCreationControls({ placement, canPlace, canCancel, onPlaceCentered, onCancel, readFailure }: {
  placement: CirclePlacement | null; canPlace: boolean; canCancel: boolean
  onPlaceCentered: () => void; onCancel: () => void
  readFailure?: { canRetry: boolean; onRetry: () => void }
}) {
  const t = useTranslations("cases.workspace.circle.placement"), { boundary, ref } = useViewerBoundary()
  const tCircle = useTranslations("cases.workspace.circle")
  const placing = placement && placement.step !== "complete"

  return <section aria-label={t("controls")} className={`${VIEWER_TOOLBAR_CLASS_NAME} w-10 flex-col`} data-circle-creation-controls ref={ref}>
    {placing ? <p className="py-1 font-data text-[10px] text-white/75" aria-label={t(`${placement.step}Hint`)} role="status">
      {t("progress", { step: placement.step === "center" ? 1 : 2 })}
    </p> : null}
    {placing ? <ViewerToolAction boundary={boundary} disabled={!canPlace} label={t("center")} description={t("centerTip")} onClick={onPlaceCentered}>
      <Crosshair aria-hidden="true" />
    </ViewerToolAction> : null}
    {placement ? <ViewerToolAction boundary={boundary} disabled={!canCancel} label={t("cancel")} description={t("cancelTip")} tone="cancel" onClick={onCancel}>
      <X aria-hidden="true" />
    </ViewerToolAction> : null}
    {readFailure ? <ViewerToolAction boundary={boundary} disabled={!readFailure.canRetry} label={tCircle("readAgain")}
      description={tCircle("readErrorDescription")} onClick={readFailure.onRetry}><RefreshCw aria-hidden="true" /></ViewerToolAction> : null}
  </section>
}

export { CaseImageCircleCreationControls }
