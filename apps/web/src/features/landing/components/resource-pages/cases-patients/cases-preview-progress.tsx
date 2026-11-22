import { getTranslations } from "next-intl/server"
import type { CSSProperties } from "react"

import styles from "./cases-preview-card.module.css"

const steps = [
  { id: "patient", color: "#3686ff", completed: true },
  { id: "exam", color: "#8761ef", completed: true },
  { id: "reports", color: "#7fc35b", completed: true },
  { id: "completion", color: "#e8ecf2", completed: false },
] as const
const completed = steps.filter(step => step.completed).length
const casePreviewProgress = {
  completed,
  total: steps.length,
  percentage: Math.round(completed / steps.length * 100),
} as const

async function CasesPreviewProgress() {
  const t = await getTranslations("resourcePages.casesPatients.preview.progress")
  const segmentSize = 100 / steps.length - 1

  return (
    <g transform="translate(5.05 -1.79)">
      <g strokeWidth="11">
        <circle cx="500" cy="128" r="41" stroke="#e8ecf2" />
        {steps.map((step, index) => step.completed ? (
          <circle data-preview-segment cx="500" cy="128" r="41" key={step.id}
            pathLength="100" stroke={step.color} strokeDasharray={`${segmentSize} ${100 - segmentSize}`}
            strokeDashoffset={-index * 100 / steps.length} transform="rotate(-90 500 128)" />
        ) : null)}
      </g>
      <text className={styles.donutCaption} textAnchor="middle" x="500" y="146">
        {t("caption", { completed: casePreviewProgress.completed, total: casePreviewProgress.total })}
      </text>
    </g>
  )
}

function CasesPreviewProgressCounter() {
  return <span aria-hidden="true" className={styles.progressCount} data-preview-progress={casePreviewProgress.percentage}
    style={{ "--progress-percentage": casePreviewProgress.percentage } as CSSProperties} />
}

export { casePreviewProgress, CasesPreviewProgress, CasesPreviewProgressCounter }
