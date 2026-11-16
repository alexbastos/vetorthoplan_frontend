"use client"

import { Crosshair, Plus, X } from "lucide-react"
import { useTranslations } from "next-intl"

import type { AnglePlacement } from "../lib/angle-editor"
import { VIEWER_TOOLBAR_CLASS_NAME } from "./viewer-toolbar"
import { useViewerBoundary, ViewerToolAction } from "./viewer-tool-action"

function CaseImageAngleCreationControls({ placement, canStartNew, canPlace, canCancel, onNew, onPlaceCentered, onCancel }: {
  placement: AnglePlacement | null; canStartNew: boolean; canPlace: boolean; canCancel: boolean
  onNew: () => void; onPlaceCentered: () => void; onCancel: () => void
}) {
  const t = useTranslations("cases.workspace.angle.placement"), { boundary, ref } = useViewerBoundary()
  const placing = placement && placement.step !== "complete"
  const step = placement?.step === "start" ? 1 : placement?.step === "vertex" ? 2 : 3
  return <section aria-label={t("controls")} className={`${VIEWER_TOOLBAR_CLASS_NAME} w-10 flex-col`} data-angle-creation-controls ref={ref}>
    {placing ? <p className="py-1 font-data text-[10px] text-white/75" aria-label={t(`${placement.step}Hint`)} role="status">
      {t("progress", { step })}
    </p> : null}
    <ViewerToolAction boundary={boundary} disabled={!canStartNew} label={t("new")} description={t("newTip")} onClick={onNew}><Plus aria-hidden="true" /></ViewerToolAction>
    {placing ? <ViewerToolAction boundary={boundary} disabled={!canPlace} label={t("center")} description={t("centerTip")} onClick={onPlaceCentered}>
      <Crosshair aria-hidden="true" />
    </ViewerToolAction> : null}
    {placement ? <ViewerToolAction boundary={boundary} disabled={!canCancel} label={t("cancel")} description={t("cancelTip")} tone="cancel" onClick={onCancel}>
      <X aria-hidden="true" />
    </ViewerToolAction> : null}
  </section>
}

export { CaseImageAngleCreationControls }
