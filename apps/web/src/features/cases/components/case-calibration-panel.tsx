"use client"

import { Check, Circle, RotateCcw, Ruler } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, type CSSProperties } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { CalibrationMarker, CaseWorkspaceFile, PixelSpacing } from "../types/case-workspace"
import styles from "./case-calibration-panel.module.css"

type WorkspaceImage = Extract<CaseWorkspaceFile, { kind: "image" }>

type CaseCalibrationPanelProps = {
  hasChanges: boolean
  image: WorkspaceImage
  isSaving: boolean
  marker: CalibrationMarker | null
  markerKind: CalibrationMarker["kind"]
  onMarkerKindChange: (kind: CalibrationMarker["kind"]) => void
  onReferenceChange: (value: string) => void
  onReset: () => void
  onSave: () => void
  reference: string
  scale: PixelSpacing | null
}

function CaseCalibrationPanel(props: CaseCalibrationPanelProps) {
  const { image, marker, markerKind, reference, scale, hasChanges, isSaving } = props
  const t = useTranslations("cases.workspace.calibration")
  const locale = useLocale()
  const ready = image.rendering.status === "ready"
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 })
  const displayedScale = scale ?? (hasChanges ? null : image.calibration?.pixelSpacing ?? null)
  const referenceMm = Number(reference.replace(",", "."))
  const isRulerValue = (valueMm: number) => valueMm > 0 && valueMm <= 100 && Math.abs(valueMm / 5 - Math.round(valueMm / 5)) < 1e-9
  const [customSizeOpen, setCustomSizeOpen] = useState(() => Boolean(reference && !isRulerValue(Number(reference.replace(",", ".")))))
  const [customSizeCm, setCustomSizeCm] = useState(() => reference ? String(Number(reference.replace(",", ".")) / 10).replace(".", ",") : "")

  return (
    <div className="min-w-0 space-y-3">
      {ready ? (
        <section aria-label={t("title")}>
          <h3 className="font-data text-[11px] font-medium text-description uppercase">{t("markerTitle")}</h3>
          <div aria-label={t("methodLabel")} className="mt-3 grid grid-cols-2 gap-2" role="group">
            <MethodButton active={markerKind === "line"} icon={<Ruler aria-hidden="true" />} label={t("line")} onClick={() => props.onMarkerKindChange("line")} />
            <MethodButton active={markerKind === "circle"} disabled={image.rendering.status === "ready" && Math.abs(image.rendering.pixelAspectRatio - 1) > 1e-6} icon={<Circle aria-hidden="true" />} label={t("circle")} onClick={() => props.onMarkerKindChange("circle")} />
          </div>
          {Math.abs(image.rendering.pixelAspectRatio - 1) > 1e-6 ? <p className="mt-2 font-data text-[10px] leading-4 text-description">{t("circleUnavailable")}</p> : null}
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-data text-[11px] font-medium text-description uppercase">{t("presetTitle")}</h3>
              <output className={`font-data text-[12px] font-semibold tabular-nums ${referenceMm > 0 ? "text-[var(--case-progress-label-active)]" : "text-muted-foreground"}`}>{referenceMm > 0 ? `${format.format(referenceMm / 10)} cm` : t("scaleUnset")}</output>
            </div>
            {customSizeOpen ? <label className="mt-3 block font-data text-[11px]" htmlFor="reference-size-cm"><span className="sr-only">{t("referenceLabel")}</span><Input id="reference-size-cm" inputMode="decimal" onChange={(event) => { const value = event.target.value; setCustomSizeCm(value); const centimeters = Number(value.replace(",", ".")); props.onReferenceChange(value.trim() && Number.isFinite(centimeters) && centimeters > 0 ? String(centimeters * 10) : "") }} placeholder={t("referencePlaceholder")} trailingIcon={<span aria-hidden="true" className="text-[11px] font-semibold text-description">cm</span>} type="text" value={customSizeCm} wrapperClassName="border-[var(--case-editor-input-border)] bg-[var(--case-editor-input-surface)] focus-within:border-[var(--case-editor-input-border-focus)]" /></label> : <div className="mt-3" style={{ "--ruler-progress": `${Math.max(0, Math.min(referenceMm, 100))}%` } as CSSProperties}>
              <div className={styles.ruler}>
                <div aria-hidden="true" className={styles.rulerTrack}><div className={styles.rulerFill} /></div>
                <input aria-label={t("rulerLabel")} aria-valuetext={referenceMm > 0 ? `${format.format(referenceMm / 10)} cm` : t("scaleUnset")} className={`${styles.rulerInput} ${referenceMm > 0 ? "" : styles.rulerUnset}`} max="10" min="0" onChange={(event) => props.onReferenceChange(event.target.value === "0" ? "" : String(Number(event.target.value) * 10))} step="0.5" type="range" value={referenceMm > 0 && referenceMm <= 100 ? referenceMm / 10 : 0} />
              </div>
              <div aria-hidden="true" className={styles.rulerTicks}>{[0, 2.5, 5, 7.5, 10].map((value) => <span key={value}>{format.format(value)}</span>)}</div>
            </div>}
            <button className="mt-2 rounded-sm font-data text-[10px] font-medium text-[var(--case-progress-label-active)] underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setCustomSizeOpen(!customSizeOpen); setCustomSizeCm(""); props.onReferenceChange("") }} type="button">{t(customSizeOpen ? "useRuler" : "otherSize")}</button>
          </div>
          <p className="mt-3 font-data text-[11px] leading-4 text-muted-foreground">{referenceMm > 0 ? t(markerKind === "line" ? "drawSizedLine" : "drawSizedCircle", { size: format.format(referenceMm / 10) }) : t("chooseMarkerSize")}</p>
          {marker && !scale && reference.trim() ? <p className="mt-2 text-[11px] text-destructive" role="alert">{t("invalidScale")}</p> : null}
          {displayedScale ? <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-2 border-t border-border pt-3 font-data"><span className="text-[10px] text-description">{image.calibration && !hasChanges ? t("savedScale") : t("scalePreview")}</span><strong className="text-[12px] font-semibold tabular-nums">{format.format(displayedScale.columnMm)} mm/px</strong>{Math.abs(displayedScale.rowMm - displayedScale.columnMm) > 1e-9 ? <span className="w-full text-[10px] text-description">{t("rowScale", { value: format.format(displayedScale.rowMm) })}</span> : null}</div> : null}
          {image.dicomScaleEvidence ? <p className="mt-3 text-[11px] leading-4 text-description">{t("dicomEvidence")}</p> : null}
          <div className="mt-4 flex gap-2"><Button className="flex-1 bg-[var(--case-editor-radio-active)] text-white hover:bg-[var(--case-editor-radio-active)] hover:opacity-90 active:bg-[var(--case-editor-radio-active)] disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-text-disabled)] disabled:opacity-100 dark:bg-[var(--button-primary-background-default)] dark:text-[var(--button-text-inverse)] dark:hover:bg-[var(--button-primary-background-hover)] dark:active:bg-[var(--button-primary-background-active)] dark:disabled:bg-[var(--button-primary-background-disabled)] dark:disabled:text-[var(--button-primary-text-disabled)] dark:disabled:opacity-100" disabled={!scale || !hasChanges} loading={isSaving} onClick={props.onSave} size="sm" type="button"><Check aria-hidden="true" />{t(image.calibration ? "update" : "save")}</Button><Button aria-label={t("reset")} className="!px-3" disabled={!hasChanges || isSaving} onClick={() => { setCustomSizeOpen(Boolean(image.calibration && !isRulerValue(image.calibration.referenceSizeMm))); setCustomSizeCm(image.calibration ? String(image.calibration.referenceSizeMm / 10).replace(".", ",") : ""); props.onReset() }} size="sm" type="button" variant="secondary"><RotateCcw aria-hidden="true" /></Button></div>
        </section>
      ) : (
        <section><p className="text-[12px] leading-5 text-description">{t("notReady")}</p></section>
      )}
    </div>
  )
}

function MethodButton({ active, disabled, icon, label, onClick }: { active: boolean; disabled?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button aria-pressed={active} className={`flex h-10 items-center justify-center gap-2 rounded-[var(--radius-token-md)] border text-[12px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-3.5 ${active ? "border-[var(--case-progress-label-active)] bg-[var(--color-surface-selected)] text-foreground" : "border-border bg-background text-content-secondary hover:bg-muted"}`} disabled={disabled} onClick={onClick} type="button">{icon}{label}</button>
}

export { CaseCalibrationPanel }
