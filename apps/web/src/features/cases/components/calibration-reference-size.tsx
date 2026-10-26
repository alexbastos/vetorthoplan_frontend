"use client"

import { ChevronDown } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useId, useState, type CSSProperties } from "react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { referenceInMillimetres, type CalibrationEditor } from "../lib/calibration-editor"
import styles from "./case-calibration-panel.module.css"
import { CasePanelHelp } from "./case-panel-help"

function CalibrationReferenceSize({ disabled, editor, onReferenceChange, onUnitChange }: {
  disabled: boolean
  editor: CalibrationEditor
  onReferenceChange: (value: string) => void
  onUnitChange: (unit: CalibrationEditor["unit"]) => void
}) {
  const t = useTranslations("cases.workspace.calibration")
  const locale = useLocale()
  const id = useId()
  const mm = referenceInMillimetres(editor.reference, editor.unit)
  const [customOpen, setCustomOpen] = useState(() => Boolean(editor.reference.trim() && (mm === null || mm > 100 || mm % 5 !== 0)))
  const format = new Intl.NumberFormat(locale, { maximumSignificantDigits: 10 })
  const label = t(editor.kind === "line" ? "remote.length" : "remote.diameter")
  const invalid = Boolean(editor.reference.trim() && mm === null)
  // The ruler offers 5 mm increments. Custom values stay exact in the editor.
  const rulerCm = mm === null ? 0 : Math.min(Math.round(mm / 5) / 2, 10)

  return <div className="mt-5 min-w-0 border-t border-border pt-4">
    <div className="flex items-baseline justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <label className="font-data text-[11px] font-medium" htmlFor={`${id}-ruler`}>{label}<span aria-hidden="true" className="text-description"> (cm)</span></label>
        <CasePanelHelp label={t("remote.sizeHelpLabel")}><p>{t("remote.sizeHelp")}</p></CasePanelHelp>
      </div>
      <output aria-live="polite" className="font-data text-[12px] font-semibold tabular-nums text-[var(--case-progress-label-active)]">
        {mm === null ? t("scaleUnset") : `${format.format(mm / 10)} cm`}
      </output>
    </div>
    <div className="mt-3" style={{ "--ruler-progress": `${rulerCm * 10}%` } as CSSProperties}>
      <div className={styles.ruler}>
        <div aria-hidden="true" className={styles.rulerTrack}><div className={styles.rulerFill} /></div>
        <input aria-valuetext={mm === null ? t("scaleUnset") : `${format.format(rulerCm)} cm`} className={`${styles.rulerInput} ${mm === null ? styles.rulerUnset : ""}`}
          id={`${id}-ruler`} max="10" min="0" step="0.5" type="range" value={rulerCm}
          onChange={event => {
            const value = Number(event.target.value) * 10
            onReferenceChange(value === 0 ? "" : String(editor.unit === "cm" ? value / 10 : value))
          }} />
      </div>
      <div aria-hidden="true" className={styles.rulerTicks}>{[0, 2.5, 5, 7.5, 10].map(value => <span key={value}>{format.format(value)}</span>)}</div>
    </div>
    <button aria-controls={`${id}-custom`} aria-expanded={customOpen}
      className="mt-3 flex items-center gap-1 rounded-sm font-data text-[10px] font-medium text-description outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      onClick={() => setCustomOpen(open => !open)} type="button">
      {t("otherSize")}<ChevronDown aria-hidden="true" className={`size-3 ${customOpen ? "rotate-180" : ""}`} />
    </button>
    {customOpen ? <div className="mt-2 min-w-0" id={`${id}-custom`}>
      <div className="flex min-w-0 items-start gap-2">
        <Input aria-describedby={invalid ? `${id}-error` : undefined} aria-invalid={invalid} aria-label={label}
          id={`${id}-reference`} inputMode="decimal" maxLength={24} onChange={event => onReferenceChange(event.target.value)}
          placeholder={t("referencePlaceholder")} type="text" value={editor.reference}
          wrapperClassName="min-w-0 flex-1 border-[var(--case-editor-input-border)] bg-[var(--case-editor-input-surface)] focus-within:border-[var(--case-editor-input-border-focus)]" />
        <Select disabled={disabled} onValueChange={value => onUnitChange(value === "cm" ? "cm" : "mm")} value={editor.unit}>
          <SelectTrigger aria-label={t("remote.unit")} className="w-20 shrink-0 border-[var(--case-editor-input-border)] bg-[var(--case-editor-input-surface)] px-2 text-[12px] font-normal hover:border-[var(--case-editor-input-border-focus)] focus:border-[var(--case-editor-input-border-focus)] focus-visible:border-[var(--case-editor-input-border-focus)] data-[state=open]:border-[var(--case-editor-input-border-focus)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="mm">mm</SelectItem>
            <SelectItem value="cm">cm</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {invalid ? <p className="mt-2 text-[11px] leading-4 text-destructive" id={`${id}-error`} role="alert">{t("remote.limit")}</p> : null}
    </div> : null}
  </div>
}

export { CalibrationReferenceSize }
