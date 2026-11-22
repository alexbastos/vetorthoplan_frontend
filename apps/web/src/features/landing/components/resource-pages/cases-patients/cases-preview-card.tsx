import { getTranslations } from "next-intl/server"

import { ResourcePreviewBackdrop, ResourcePreviewVeil } from "../resource-preview-backdrop"
import { resourcePreviewFonts } from "../resource-preview-fonts"
import styles from "./cases-preview-card.module.css"
import { casesPreviewGeometry as geometry } from "./cases-preview-geometry"
import { CasesPreviewShadows } from "./cases-preview-shadows"
import { CasesPreviewPatient } from "./cases-preview-patient"
import { casePreviewProgress, CasesPreviewProgress, CasesPreviewProgressCounter } from "./cases-preview-progress"
import { casePreviewSummary, CasesPreviewSummary } from "./cases-preview-summary"

async function CasesPreviewCard() {
  const t = await getTranslations("resourcePages.casesPatients.preview")

  return (
    <article aria-labelledby="cases-preview-title" className={`${styles.card} ${resourcePreviewFonts}`}>
      <div aria-label={t("illustrationLabel", {
        progress: casePreviewProgress.percentage, completed: casePreviewProgress.completed, total: casePreviewProgress.total,
        uploaded: casePreviewSummary.uploadedFiles, filesTotal: casePreviewSummary.expectedFiles, reports: casePreviewSummary.completedReports,
        examStatus: t(casePreviewSummary.examComplete ? "summary.complete" : "summary.pending"),
      })}
        className={styles.visual} role="img">
        <svg aria-hidden="true" className={styles.artwork} fill="none" viewBox="0 0 629 427">
          <defs>
            <CasesPreviewShadows />
            <clipPath id="cases-preview-panel-clip">
              <rect {...geometry.panel} />
            </clipPath>
            <filter filterUnits="userSpaceOnUse" height="667" id="cases-preview-aurora" width="750" x="0" y="-120">
              <feGaussianBlur stdDeviation={geometry.glowBlur} />
            </filter>
            <filter height="170%" id="cases-preview-shadow" width="130%" x="-15%" y="-25%">
              <feDropShadow dx="0" dy="6" floodColor="#233b66" floodOpacity=".08" stdDeviation="9" />
            </filter>
            <linearGradient id="cases-preview-summary-veil" gradientUnits="userSpaceOnUse" x1="401.566" y1="253.717" x2="401.566" y2="364.32">
              <stop stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Keep all blue artwork inside the SVG so the full-width veil covers it. */}
          <ResourcePreviewBackdrop idPrefix="cases-preview" />
          {/* The fixed panel extends beyond the viewBox; the final veil hides its base. */}
          <g filter="url(#cases-preview-shadow-panel)">
            <rect {...geometry.panel} fill="white" />
          </g>
          <g clipPath="url(#cases-preview-panel-clip)">
            <rect {...geometry.panel} fill="white" />
            {geometry.glowCapsules.map(capsule => (
              <g filter="url(#cases-preview-aurora)" key={capsule.x}><rect {...capsule} /></g>
            ))}
          </g>
          <rect {...geometry.panelOutline} fill="none" stroke="white" strokeWidth="2" />
          <g filter="url(#cases-preview-shadow)">
            <rect {...geometry.progress} fill="white" stroke="#f2f2f2" />
            <rect {...geometry.summary} fill="white" stroke="#f2f2f2" />
          </g>
          <g filter="url(#cases-preview-shadow-note)">
            <rect {...geometry.patient} fill="white" />
          </g>
          <rect {...geometry.patientOutline} fill="none" stroke="black" strokeOpacity="0.04" />
          <line {...geometry.patientDivider} stroke="#F8F8F8" strokeWidth="0.82" />
          <CasesPreviewProgress />
          <CasesPreviewPatient />
          <CasesPreviewSummary />
          {/* Keep the supplied veil coordinates above the original card content. */}
          <rect x="256.781" y="220.079" width="289.57" height="242.613" fill="url(#cases-preview-summary-veil)" />
          <ResourcePreviewVeil idPrefix="cases-preview" />
        </svg>
        <CasesPreviewProgressCounter />
      </div>
      <div className={styles.copy}>
        <h2 id="cases-preview-title">{t("title")}</h2>
        <p>{t("description")}</p>
      </div>
    </article>
  )
}

export { CasesPreviewCard }
