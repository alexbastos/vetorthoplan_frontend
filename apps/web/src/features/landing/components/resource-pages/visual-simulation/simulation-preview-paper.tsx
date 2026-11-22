import type { SimulationPreviewCopy, SimulationPreviewPatient } from "./simulation-preview-copy"
import styles from "./visual-simulation-preview.module.css"

function SimulationPreviewPaper({ idPrefix, copy, patient, active }: {
  idPrefix: string; copy: SimulationPreviewCopy; patient: SimulationPreviewPatient; active: boolean;
}) {
  return (
    <div className={styles.paper} data-simulation-paper data-active={active}>
      <div className={styles.paperSoft} data-simulation-shadow />
      <div className={styles.paperContact} data-simulation-shadow />
      <div className={styles.paperSurface}>
        <div className={styles.paperHeader}>
          <dl><div><dt>{copy.caseLabel}</dt><dd>{patient.caseId}</dd></div></dl>
          <dl className={styles.paperHeaderDetails}>
            <div><dt>{copy.planLabel}</dt><dd>{copy.planName}</dd></div>
            <div><dt>{copy.projectionLabel}</dt><dd>{copy.projection}</dd></div>
          </dl>
        </div>
        <div className={styles.paperSummary}>
          <div className={styles.patient}>
            <span className={styles.label}>{copy.patientLabel}</span>
            <div className={styles.patientIdentity}>
              <svg aria-hidden="true" className={styles.avatar} viewBox="0 0 34 34">
                <defs><clipPath id={`${idPrefix}-patient`}><rect width="34" height="34" rx="8.32" /></clipPath></defs>
                <image href={patient.avatarSrc} width="34" height="34" clipPath={`url(#${idPrefix}-patient)`} preserveAspectRatio="xMidYMid slice" />
              </svg>
              <div><strong>{patient.name}</strong><span className={styles.patientSummary}>{copy.patientSummary}</span></div>
            </div>
          </div>
          <div className={styles.planSummary}>
            <span className={styles.label}>{copy.summaryLabel}</span>
            <div className={styles.paperPlanIdentity}>
              <svg aria-hidden="true" className={styles.planSummaryIcon} viewBox="0 0 34 34" fill="none">
                <image href="/icons/icon-strategy.svg" width="34" height="34" preserveAspectRatio="xMidYMid meet" />
              </svg>
              <div><strong>{copy.summaryTitle}</strong><span>{copy.summaryDescription}</span></div>
            </div>
          </div>
        </div>
        <div className={styles.paperBody}>
          <h3>{copy.documentTitle}</h3>
          <p>{copy.fragment}</p>
          <dl className={styles.paperParameters}>
            <div><dt>{copy.radiusLabel}</dt><dd>{copy.radiusValue}</dd></div>
            <div><dt>{copy.rotationLabel}</dt><dd>{copy.rotationValue}</dd></div>
          </dl>
          <p className={styles.paperNote}>{copy.note}</p>
        </div>
      </div>
    </div>
  )
}

export { SimulationPreviewPaper }
