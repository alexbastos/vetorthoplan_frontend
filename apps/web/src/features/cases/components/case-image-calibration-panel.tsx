"use client"

import { Check, Circle, Crosshair, RefreshCw, Ruler } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import type { ImageCalibrationState } from "../hooks/use-image-calibration"
import { referenceInMillimetres } from "../lib/calibration-editor"
import { ImagePlanError } from "../services/image-plan-api"
import { CalibrationReferenceSize } from "./calibration-reference-size"
import { CasePanelHelp } from "./case-panel-help"

function CaseImageCalibrationPanel({ calibration: c, interactionBlocked = false, onSave, onPlace, onCheck, onCancel }: {
  calibration: ImageCalibrationState; interactionBlocked?: boolean; onSave: () => void; onPlace: () => void; onCheck: () => void; onCancel?: () => void
}) {
  const t = useTranslations("cases.workspace.calibration")
  const { editor, receipt } = c
  const pending = receipt.phase === "saving" || receipt.phase === "checking" || c.save.isPending
  const saveLabel = t(c.plan?.document.calibration ? "update" : "remote.save")
  const conflict = receipt.phase === "conflict" || c.needsRebase
  const readError = c.planQuery.error instanceof ImagePlanError ? c.planQuery.error.code : undefined
  const code = receipt.phase === "error" ? receipt.code : readError
  const errorKey = code === "CLINICAL_VALIDATION_INVALID" ? "remote.reviewBlocked"
    : code === "IMAGE_NOT_READY" || code === "IMAGE_NOT_FOUND" ? "notReady" : receipt.phase === "error" ? "saveError" : "remote.readError"

  if (c.issue) return <p className="text-[12px] leading-5 text-description" role="status">{t(c.issue === "anisotropy" ? "remote.anisotropy" : "remote.dimensions")}</p>
  if (!c.plan && !editor && c.planQuery.isPending) return <p aria-busy="true" className="text-[12px] text-description" role="status">{t("remote.loading")}</p>

  return <div className="flex min-w-0 flex-1 flex-col gap-4">
    {c.state === "loading" ? <p aria-busy="true" className="text-[12px] text-description" role="status">{t("remote.loading")}</p> : null}
    {code || c.planQuery.isError ? <div className="space-y-2" role="alert">
      <p className="text-[12px] leading-5 text-destructive">{t(errorKey)}</p>
      {c.planQuery.isError ? <Button disabled={c.locked || c.deleting || c.planQuery.isFetching} onClick={c.refresh} size="sm" variant="secondary"><RefreshCw aria-hidden="true" />{t("remote.retry")}</Button> : null}
    </div> : null}
    {editor ? <>
      <fieldset className="min-w-0" disabled={!c.canEdit || interactionBlocked}>
        <legend className="flex w-full items-center justify-between gap-2 font-data text-[11px] font-medium text-foreground">
          <span>{t("markerTitle")}</span>
          <CasePanelHelp label={t("remote.help")}>
            <p>{t(editor.kind === "line" ? "lineHint" : "circleHint")}</p>
            <p>{t("remote.keyboard")}</p>
          </CasePanelHelp>
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ShapeButton active={editor.kind === "line"} label={t("line")} onClick={() => c.changeKind("line")}><Ruler aria-hidden="true" /></ShapeButton>
          <ShapeButton active={editor.kind === "circle"} label={t("circle")} onClick={() => c.changeKind("circle")}><Circle aria-hidden="true" /></ShapeButton>
        </div>
        <CalibrationReferenceSize disabled={!c.canEdit} editor={editor} onReferenceChange={c.changeReference} onUnitChange={c.changeUnit} />
        {!c.marker ? <Button className="mt-3 w-full" onClick={onPlace} size="sm" type="button" variant="secondary"><Crosshair aria-hidden="true" />{t("remote.place")}</Button> : null}
      </fieldset>
      {!c.canEdit && !c.locked && !c.deleting && !c.planQuery.isError && c.state !== "loading" ? <p className="text-[12px] leading-5 text-description" role="status">{t(c.otherIntent ? "remote.otherEdit" : "notReady")}</p> : null}
      {c.hasChanges && editor.geometry && referenceInMillimetres(editor.reference, editor.unit) !== null && !c.command() && !conflict && !c.locked && c.canEdit ? <p className="text-[11px] leading-4 text-destructive" role="alert">{t("invalidScale")}</p> : null}
      {conflict ? <p className="text-[12px] leading-5 text-destructive" role="alert">{t("remote.conflict")}</p> : null}
      {receipt.phase === "uncertain" ? <div className="space-y-3" role="status"><p className="text-[12px] leading-5 text-description">{t("remote.uncertain")}</p>
        <Button disabled={c.deleting || c.save.isPending} onClick={onCheck} size="sm" variant="secondary"><RefreshCw aria-hidden="true" />{t("remote.check")}</Button></div> : null}
      <div aria-live="polite" className="mt-auto pt-4">
        {pending ? <p className="mb-3 text-[12px] text-description">{t(receipt.phase === "checking" ? "remote.checking" : "remote.saving")}</p> : null}
        <div className={`grid gap-2 ${onCancel ? "grid-cols-2" : "grid-cols-1"}`}>
          {onCancel ? <Button className="min-w-0 w-full px-2" disabled={c.locked || c.deleting} onClick={onCancel} size="sm" type="button" variant="ghost">{t("cancelEditing")}</Button> : null}
          <Button aria-label={saveLabel} className="min-w-0 w-full px-2" disabled={!c.canSave || pending || interactionBlocked} loading={pending} onClick={onSave} size="sm" title={saveLabel} type="button">{!pending ? <Check aria-hidden="true" /> : null}{t(c.plan?.document.calibration ? "actions.update" : "actions.save")}</Button>
        </div>
      </div>
    </> : null}
  </div>
}

function ShapeButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return <button aria-pressed={active} className={`flex h-10 items-center justify-center gap-2 rounded-[var(--radius-token-md)] border text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-3.5 ${active ? "border-[var(--case-progress-label-active)] bg-[var(--color-surface-selected)] text-foreground" : "border-border bg-background text-content-secondary hover:bg-muted"}`}
    onClick={onClick} type="button">{children}{label}</button>
}

export { CaseImageCalibrationPanel }
