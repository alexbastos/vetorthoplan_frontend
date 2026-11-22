import { getTranslations } from "next-intl/server"

import { ResourcePreviewBackdrop, ResourcePreviewVeil } from "../resource-preview-backdrop"
import { resourcePreviewFonts } from "../resource-preview-fonts"
import { SurgicalPreviewDefs } from "./surgical-preview-defs"
import { SurgicalPreviewPanel } from "./surgical-preview-panel"
import { SurgicalPreviewPhoto } from "./surgical-preview-photo"
import { surgicalPreviewGeometry } from "./surgical-preview-geometry"
import styles from "./surgical-planning-preview.module.css"

async function SurgicalPlanningPreview() {
  const t = await getTranslations("resourcePages.surgicalPlanning.preview")
  const idPrefix = "surgical-planning-preview"

  return (
    <article className={`${styles.frame} ${resourcePreviewFonts}`} aria-labelledby="surgical-planning-preview-title">
      <div className={styles.visual} role="img" aria-label={t("illustrationLabel")}>
        <svg aria-hidden="true" className={styles.artwork} fill="none" viewBox="0 0 629 427">
          <ResourcePreviewBackdrop idPrefix={idPrefix} />
          <ResourcePreviewVeil idPrefix={idPrefix} />
          <SurgicalPreviewDefs idPrefix={idPrefix} />
          <g clipPath={`url(#${idPrefix}-viewport)`}>
            <g transform={surgicalPreviewGeometry.illustrationTransform}>
              <SurgicalPreviewPanel idPrefix={idPrefix} copy={{
                badge: t("badge"), firstLine: t("message.firstLine"),
                secondLine: t("message.secondLine"), reviewed: t("reviewed"),
              }} />
            </g>
            <rect {...surgicalPreviewGeometry.panelVeil} fill={`url(#${idPrefix}-panel-veil)`} />
            <g transform={surgicalPreviewGeometry.illustrationTransform}>
              <SurgicalPreviewPhoto idPrefix={idPrefix} />
            </g>
          </g>
        </svg>
      </div>
      <div className={styles.copy}>
        <h2 id="surgical-planning-preview-title">{t("title")}</h2>
        <p>{t("description")}</p>
      </div>
    </article>
  )
}

export { SurgicalPlanningPreview }
