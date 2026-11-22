import { getFormatter, getTranslations } from "next-intl/server"

import styles from "./cases-preview-card.module.css"
import { casePreviewPatient as patient } from "./cases-preview-patient-data"

async function CasesPreviewPatient() {
  const [t, format] = await Promise.all([
    getTranslations("resourcePages.casesPatients.preview.patient"),
    getFormatter(),
  ])
  const fields = [
    { key: "age", value: t("ageValue", { years: patient.age }) },
    { key: "birth", value: format.dateTime(patient.birthDate, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }) },
    { key: "weight", value: t("weightValue", { weight: patient.weight }) },
    { key: "breed", value: t("breedValue") },
    { key: "sex", value: t("sexValue") },
    { key: "species", value: t("speciesValue") },
  ] as const

  return (
    <g>
      <defs>
        <clipPath id="cases-preview-patient-avatar">
          <rect x="60" y="75.738" width="29.077" height="29.077" rx="10.904" />
        </clipPath>
      </defs>
      <rect x="60" y="75.738" width="29.077" height="29.077" rx="10.904" fill="#ededed" />
      <image clipPath="url(#cases-preview-patient-avatar)" href={patient.avatarSrc}
        x="60" y="75.738" width="29.077" height="29.077" preserveAspectRatio="xMidYMid slice" />
      <text className={styles.patientName} x="99" y="88">{patient.name}</text>
      <text className={styles.patientSubtitle} x="99" y="102">{t("subtitle")}</text>
      <text className={styles.patientCaseId} textAnchor="end" x="405" y="93">{t("caseId", { id: patient.caseId })}</text>
      {fields.map((field, index) => {
        const x = 60 + index % 3 * 117
        const y = index < 3 ? 126 : 157

        return (
          <g key={field.key}>
            <text className={styles.patientFieldLabel} x={x} y={y}>{t(`labels.${field.key}`)}</text>
            <text className={styles.patientFieldValue} x={x} y={y + 14}>{field.value}</text>
          </g>
        )
      })}
    </g>
  )
}

export { CasesPreviewPatient }
