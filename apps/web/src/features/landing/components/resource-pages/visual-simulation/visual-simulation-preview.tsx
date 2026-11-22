import type { CSSProperties } from "react"
import { getTranslations } from "next-intl/server"

import { ResourcePreviewBackdrop, ResourcePreviewVeil, ResourcePreviewVeilGradient } from "../resource-preview-backdrop"
import { resourcePreviewFonts } from "../resource-preview-fonts"
import { simulationPreviewGeometry as geometry } from "./simulation-preview-geometry"
import { simulationPreviewCases } from "./simulation-preview-cases"
import { SimulationPreviewScene } from "./simulation-preview-scene"
import type { SimulationPreviewCaseView } from "./simulation-preview-copy"
import styles from "./visual-simulation-preview.module.css"

const stageStyle = {
  "--stage-w": geometry.stage.width, "--stage-h": geometry.stage.height, "--stage-max-scale": geometry.stage.maxScale,
  "--paper-x": `${geometry.paper.x}px`, "--paper-y": `${geometry.paper.y}px`,
  "--paper-w": `${geometry.paper.width}px`, "--paper-h": `${geometry.paper.minHeight}px`,
  "--table-x": `${geometry.table.x}px`, "--table-y": `${geometry.table.y - geometry.table.lift}px`,
  "--table-w": `${geometry.table.width}px`, "--table-radius": `${geometry.table.radius}px`,
  "--table-padding": `${geometry.table.padding}px`, "--row-h": `${geometry.table.rowHeight}px`,
} as CSSProperties

async function VisualSimulationPreview() {
  const t = await getTranslations("resourcePages.visualSimulation.preview")
  const idPrefix = "visual-simulation-preview"
  const cases: SimulationPreviewCaseView[] = simulationPreviewCases.map(({ id, patient, plan, summary }) => ({
    id, patient,
    copy: {
      planLabel: t("scene.planLabel"), planName: t("scene.planName"),
      caseLabel: t("scene.caseLabel"), caseId: t("scene.caseId", { id: patient.caseId }),
      projectionLabel: t("scene.projectionLabel"), projection: t("scene.projection"),
      patientLabel: t("scene.patientLabel"), patientSummary: t("scene.patientSummary", { years: patient.age }),
      summaryLabel: t("scene.summaryLabel"), summaryTitle: t(`scene.summaries.${summary}.title`),
      summaryDescription: t(`scene.summaries.${summary}.description`),
      documentTitle: t("scene.documentTitle"),
      fragment: t("scene.fragment"), note: t("scene.note"), file: t("scene.file"),
      radiusLabel: t("scene.radiusLabel"), rotationLabel: t("scene.rotationLabel"),
      radiusValue: t("scene.radiusValue", { value: plan.radius }),
      rotationValue: t("scene.rotationValue", { value: plan.rotation }),
      editing: t("scene.editing"), saved: t("scene.saved"),
    },
  }))

  return (
    <article className={`${styles.frame} ${resourcePreviewFonts}`} aria-labelledby="visual-simulation-preview-title">
      <div className={styles.visual} role="img" aria-label={t("illustrationLabel", {
        first: cases[0].patient.name, second: cases[1].patient.name, third: cases[2].patient.name,
      })}>
        <svg aria-hidden="true" className={styles.background} fill="none" viewBox="0 0 629 427">
          <ResourcePreviewBackdrop idPrefix={`${idPrefix}-sky`} />
        </svg>
        <SimulationPreviewScene cases={cases} idPrefix={idPrefix} stageStyle={stageStyle} />
        <svg aria-hidden="true" className={styles.veil} fill="none" viewBox="0 0 629 427">
          <defs><ResourcePreviewVeilGradient idPrefix={idPrefix} /></defs>
          <ResourcePreviewVeil idPrefix={idPrefix} />
        </svg>
      </div>
      <div className={styles.copy}>
        <h2 id="visual-simulation-preview-title">{t("title")}</h2>
        <p>{t("description")}</p>
      </div>
    </article>
  )
}

export { VisualSimulationPreview }
