"use client"

import { useRef, type CSSProperties } from "react"

import { useSimulationPreviewCycle } from "./animations/use-simulation-preview-cycle"
import type { SimulationPreviewCaseView } from "./simulation-preview-copy"
import { SimulationPreviewPaper } from "./simulation-preview-paper"
import { SimulationPreviewTable } from "./simulation-preview-table"
import styles from "./visual-simulation-preview.module.css"

function SimulationPreviewScene({ cases, idPrefix, stageStyle }: {
  cases: readonly SimulationPreviewCaseView[]; idPrefix: string; stageStyle: CSSProperties;
}) {
  const scope = useRef<HTMLDivElement>(null)
  const selection = useSimulationPreviewCycle(scope, cases.length)

  return (
    <div aria-hidden="true" className={styles.stageFrame} style={stageStyle} ref={scope} data-case={cases[selection.index]?.id} data-phase={selection.phase}>
      <div className={styles.stage}>
        {cases.map((item, index) => (
          <SimulationPreviewPaper key={item.id} idPrefix={`${idPrefix}-${item.id}`} patient={item.patient}
            copy={item.copy} active={index === selection.index} />
        ))}
        <SimulationPreviewTable cases={cases} selection={selection} />
      </div>
    </div>
  )
}

export { SimulationPreviewScene }
