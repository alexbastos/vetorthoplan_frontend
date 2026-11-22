import { getTranslations } from "next-intl/server"

import styles from "./cases-preview-card.module.css"

const casePreviewSummary = {
  uploadedFiles: 5,
  expectedFiles: 7,
  completedReports: 4,
  examComplete: true,
} as const

async function CasesPreviewSummary() {
  const t = await getTranslations("resourcePages.casesPatients.preview.summary")
  const metrics = [
    { id: "uploads", ratio: casePreviewSummary.uploadedFiles / casePreviewSummary.expectedFiles,
      value: t("uploadsValue", { uploaded: casePreviewSummary.uploadedFiles, total: casePreviewSummary.expectedFiles }) },
    { id: "exam", ratio: casePreviewSummary.examComplete ? 1 : 0,
      value: t(casePreviewSummary.examComplete ? "complete" : "pending") },
    { id: "reports", ratio: null, value: t("reportsValue", { count: casePreviewSummary.completedReports }) },
  ] as const

  return (
    <g transform="translate(-2.2 -3.03)">
      <text className={styles.summaryHeading} x="266" y="237">{t("title")}</text>
      {metrics.map((metric, index) => {
        const y = 253 + index * 33

        return (
          <g data-preview-row key={metric.id}>
            <rect x="266" y={y} width="278" height="25" rx="4" fill="#eef5ff" />
            {metric.ratio !== null ? (
              <rect data-preview-fill x="266" y={y}
                width={278 * metric.ratio} height="25" rx="4" fill="#3686ff" />
            ) : null}
            <text className={metric.ratio ? styles.summaryLabelOnFill : styles.summaryLabel}
              x="278" y={y + 16}>{t(`labels.${metric.id}`)}</text>
            {metric.ratio === null ? (
              <>
                <rect x="508" y={y + 4} width="26" height="17" rx="4" fill="#3686ff" />
                <text className={styles.summaryCount} textAnchor="middle" x="521" y={y + 16}>{metric.value}</text>
              </>
            ) : (
              <text className={metric.ratio === 1 ? styles.summaryValueOnFill : styles.summaryValue}
                textAnchor="end" x="534" y={y + 16}>{metric.value}</text>
            )}
          </g>
        )
      })}
    </g>
  )
}

export { casePreviewSummary, CasesPreviewSummary }
