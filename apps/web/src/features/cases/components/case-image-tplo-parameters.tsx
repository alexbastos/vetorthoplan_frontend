"use client"

import { Check, RefreshCw, X } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"
import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { parseTploParameterFields, type TploParameterFields } from "../lib/tplo-parameters"
import { CasePanelHelp } from "./case-panel-help"
import { ViewerMeasurementAction } from "./viewer-measurement-card"
import { useViewerBoundary } from "./viewer-tool-action"

function CaseImageTploParameters({ fields, canEdit, canSave, canCancel, stale, onChange, onSave, onCancel, children, readFailure }: {
  fields: TploParameterFields; canEdit: boolean; canSave: boolean; canCancel: boolean; stale: boolean
  onChange: (fields: TploParameterFields) => void; onSave: () => void; onCancel: () => void; children?: ReactNode
  readFailure?: { canRetry: boolean; onRetry: () => void }
}) {
  const t = useTranslations("cases.workspace.tplo.parameters"), id = useId(), { boundary, ref } = useViewerBoundary()
  const firstField = useRef<HTMLSelectElement>(null)
  useEffect(() => { firstField.current?.focus({ preventScroll: true }) }, [])
  const parsed = parseTploParameterFields(fields)
  const invalid = new Set(parsed.success ? [] : parsed.error.issues.map(issue => issue.path[0]))
  return <section ref={ref} aria-labelledby={id} data-tplo-parameters
    className="max-h-full w-56 max-w-full overflow-y-auto overscroll-contain rounded-[var(--radius-token-md)] border border-white/10 bg-[var(--color-obsidian)] text-white shadow-sm">
    <h3 id={id} className="border-b border-white/10 px-3 py-2 text-xs font-medium">{t("title")}</h3>
    <p className="px-3 pt-3 text-[11px] leading-4 text-white/70">{t("global")}</p>
    {stale ? <p role="status" className="px-3 pt-2 text-[11px] text-white/70">{t("stale")}</p> : null}
    {readFailure ? <div className="space-y-1 px-3 pt-2"><p role="status" className="text-[11px] text-white/70">{t("readError")}</p>
      <ViewerMeasurementAction boundary={boundary} label={t("retryRead")} disabled={!readFailure.canRetry} onClick={readFailure.onRetry} icon={<RefreshCw aria-hidden="true" />} /></div> : null}
    <form className="space-y-3 p-3" onSubmit={event => { event.preventDefault(); if (canSave && parsed.success) onSave() }}>
      {(["laterality", "projection"] as const).map(key => <div className="space-y-1" key={key}>
        <label htmlFor={`${id}-${key}`} className="block text-[11px]">{t(key)}</label>
        <select ref={key === "laterality" ? firstField : undefined} id={`${id}-${key}`} value={fields[key]} disabled={!canEdit} required={key === "laterality"} aria-invalid={invalid.has(key)} aria-describedby={invalid.has(key) ? `${id}-invalid` : undefined}
          className="h-8 w-full rounded-[var(--radius-token-sm)] border border-white/20 bg-[var(--color-obsidian)] px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-40"
          onChange={event => onChange({ ...fields, [key]: event.target.value })}>
          {key === "laterality" ? <option value="">{t("chooseSide")}</option> : null}
          {(key === "laterality" ? ["LEFT", "RIGHT"] as const : ["UNKNOWN", "MEDIOLATERAL", "CRANIOCAUDAL"] as const).map(value => <option key={value} value={value}>{t(`options.${value}`)}</option>)}
        </select>
      </div>)}
      {(["blade_diameter_mm", "current_slope_degrees", "target_slope_degrees"] as const).map(key => <div className="space-y-1" key={key}>
        <div className="flex items-center gap-1"><label htmlFor={`${id}-${key}`} className="text-[11px]">{t(key)}</label>
          <CasePanelHelp label={t(`${key}Help`)} portalContainer={boundary} className="size-5 text-white/70 hover:bg-white/10 hover:text-white"><p>{t(`${key}Tip`)}</p></CasePanelHelp></div>
        <Input id={`${id}-${key}`} type="text" inputMode="decimal" maxLength={32} value={fields[key]} disabled={!canEdit}
          aria-invalid={invalid.has(key)} aria-describedby={invalid.has(key) ? `${id}-invalid` : undefined}
          onChange={event => onChange({ ...fields, [key]: event.target.value })} className="font-data text-xs text-white"
          wrapperClassName="h-8 border-white/20 bg-white/5 focus-within:border-white/50" />
      </div>)}
      {!parsed.success ? <p id={`${id}-invalid`} role="status" className="text-[11px] leading-4 text-white/70">{t("invalid")}</p> : null}
      <button type="submit" disabled={!canSave || !parsed.success} className="flex min-h-8 w-full items-center gap-2 rounded-[var(--radius-token-sm)] px-2 text-left text-[11px] text-[var(--color-sage-500)] outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-40"><Check aria-hidden="true" className="size-3.5" />{t("save")}</button>
      <ViewerMeasurementAction boundary={boundary} label={t("cancel")} disabled={!canCancel} icon={<X aria-hidden="true" />} onClick={onCancel} />
    </form>
    {children}
  </section>
}

export { CaseImageTploParameters }
