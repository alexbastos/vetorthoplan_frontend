"use client"

import { CircleHelp, Mars, Venus } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { getPatientAgeYears } from "../lib/patient-age"
import type { CaseSummary } from "../types/cases"

const detailLabelClassName = "font-data text-[0.6875rem] leading-4 font-medium text-foreground"
const detailValueClassName = "mt-1 whitespace-pre-wrap break-words text-[0.75rem] leading-5 font-normal text-description"

function CaseContextDetails({ caseSummary }: { caseSummary: CaseSummary }) {
  const t = useTranslations("cases.workspace.caseDetails")
  const tStatus = useTranslations("cases.list.status")
  const locale = useLocale()
  const patient = caseSummary.patient
  const ageYears = getPatientAgeYears(patient.age)
  const sex = patient.sex === "male" || patient.sex === "female" ? patient.sex : "notInformed"
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
  const birthDate = patient.age?.kind === "birth-date"
    ? dateFormatter.format(new Date(`${patient.age.birthDate}T00:00:00Z`))
    : null
  const weight = patient.weightKg == null
    ? t("notInformed")
    : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(patient.weightKg)} kg`

  return (
    <section aria-label={t("heading")} className="min-w-0">
      <div>
        <h3 className={detailLabelClassName}>{t("identification")}</h3>
        <p className={detailValueClassName}>{caseSummary.title}</p>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className={detailLabelClassName}>{t("patient")}</h3>
        <div className="mt-1 flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[0.75rem] leading-5 font-normal text-description" title={patient.name}>{patient.name}</p>
          <span aria-label={t(`sex.${sex}`)} className="shrink-0 text-[var(--case-progress-label-active)]" role="img">
            {sex === "male" ? <Mars aria-hidden="true" className="size-4" /> : sex === "female" ? <Venus aria-hidden="true" className="size-4 text-[var(--color-patient-sex-female)]" /> : <CircleHelp aria-hidden="true" className="size-4 text-description" />}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
          <DetailField label={t("species")} value={patient.species} />
          <DetailField label={t("breed")} value={patient.breed || t("notInformed")} />
          <DetailField label={t("sexLabel")} value={t(`sex.${sex}`)} />
          <DetailField label={t("age")} value={ageYears === null ? t("notInformed") : t("ageYears", { count: ageYears })} />
          {birthDate ? <DetailField label={t("birthDate")} value={birthDate} /> : null}
          <DetailField label={t("weight")} value={weight} />
        </dl>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className={detailLabelClassName}>{t("clinical")}</h3>
        <p className={detailValueClassName}>{caseSummary.clinicalNotes || t("notInformed")}</p>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className={detailLabelClassName}>{t("record")}</h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
          <DetailField label={t("status")} value={tStatus(caseSummary.status)} />
          <DetailField label={t("createdAt")} value={dateFormatter.format(new Date(caseSummary.createdAt))} />
          <DetailField label={t("updatedAt")} value={dateFormatter.format(new Date(caseSummary.updatedAt))} />
        </dl>
        <dl className="mt-4 min-w-0">
          <div className="min-w-0">
            <dt className={detailLabelClassName}>{t("id")}</dt>
            <dd className="mt-1 truncate font-data text-[10px] leading-5 font-normal text-description" title={caseSummary.id}>{caseSummary.id}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={detailLabelClassName}>{label}</dt>
      <dd className={detailValueClassName}>{value}</dd>
    </div>
  )
}

export { CaseContextDetails }
