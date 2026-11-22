import type { CSSProperties } from "react"
import type { SimulationPreviewCaseView, SimulationPreviewSelection } from "./simulation-preview-copy"
import styles from "./visual-simulation-preview.module.css"

function SimulationPreviewTable({ cases, selection }: { cases: readonly SimulationPreviewCaseView[]; selection: SimulationPreviewSelection }) {
  const entries = [...cases, ...cases]

  return (
    <div className={styles.tableSurface}>
      <div className={styles.rowsViewport}>
        {entries.map(({ id, copy, patient }, sequence) => {
          const slot = (selection.step - sequence + entries.length) % entries.length
          const phase = sequence === selection.step ? selection.phase : "saved"
          return (
            <div key={`${id}-${sequence}`} className={styles.queueRow} data-simulation-row
              data-sequence={sequence} data-visible={slot < 3} style={{ "--row-slot": slot } as CSSProperties}>
              <table className={styles.planTable}>
                <colgroup>
                  <col className={styles.patientColumn} /><col className={styles.imageColumn} />
                  <col className={styles.planColumn} /><col className={styles.valueColumn} />
                  <col className={styles.valueColumn} /><col />
                </colgroup>
                <tbody>
                  <tr data-state={phase}>
                    <td><span className={styles.label}>{copy.caseId}</span><span className={styles.rowValue}>{patient.name}</span></td>
                    <td><span className={styles.rowFile}>{copy.file}</span></td>
                    <td>
                      <div className={styles.planIdentity}>
                        <svg aria-hidden="true" className={styles.planIcon} width="27" height="27" viewBox="0 0 27 27" fill="none">
                          <rect width="27" height="27" rx="8" fill="currentColor" fillOpacity=".08" />
                          <path d="M19.5 10A6.5 6.5 0 1 1 13.5 7M19.5 6.5V11H15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span><span className={styles.label}>{copy.caseId}</span><span className={styles.rowValue}>{patient.name}<span className={styles.planSuffix}> · {copy.planName}</span></span></span>
                      </div>
                    </td>
                    <td><span className={styles.label}>{copy.radiusLabel}</span><span className={styles.rowValue}>{copy.radiusValue}</span></td>
                    <td><span className={styles.label}>{copy.rotationLabel}</span><span className={styles.rowValue}>{copy.rotationValue}</span></td>
                    <td>
                      <span className={styles.statusCell} data-phase={phase}>
                        <span className={styles.editingBadge} data-simulation-open>{copy.editing}</span>
                        <span className={styles.savedBadge} data-simulation-saved>
                          <svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L4.8 8.3L9.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {copy.saved}
                        </span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { SimulationPreviewTable }
