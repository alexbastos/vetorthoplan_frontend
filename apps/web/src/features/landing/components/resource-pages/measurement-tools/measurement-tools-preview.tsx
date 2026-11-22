import { getTranslations } from "next-intl/server"

import { ResourcePreviewBackdrop, ResourcePreviewVeil } from "../resource-preview-backdrop"
import { resourcePreviewFonts } from "../resource-preview-fonts"
import { measurementPreviewExample } from "./measurement-preview-geometry"
import { MeasurementPreviewForegroundVeil } from "./measurement-preview-foreground-veil"
import { MeasurementPreviewToolsPanel } from "./measurement-preview-tools-panel"
import { MeasurementPreviewViewer } from "./measurement-preview-viewer"
import styles from "./measurement-tools-preview.module.css"

async function MeasurementToolsPreview() {
  const t = await getTranslations("resourcePages.measurementTools.preview")
  const idPrefix = "measurement-tools-preview"
  const value = t("value", { value: measurementPreviewExample.millimeters })
  const unit = t("unit")

  return (
    <article className={`${styles.frame} ${resourcePreviewFonts}`} aria-labelledby="measurement-tools-preview-title">
      <div className={styles.visual} role="img" aria-label={t("illustrationLabel", { value: measurementPreviewExample.millimeters })}>
        <svg aria-hidden="true" className={styles.artwork} fill="none" viewBox="0 0 629 427">
          <ResourcePreviewBackdrop idPrefix={idPrefix} />
          <ResourcePreviewVeil idPrefix={idPrefix} />
          <MeasurementPreviewViewer idPrefix={idPrefix}
            copy={{ file: t("file"), value, unit, calibrated: t("imageCalibrated") }} />
          <MeasurementPreviewForegroundVeil idPrefix={idPrefix} surface="viewer" />
          <MeasurementPreviewToolsPanel idPrefix={idPrefix} copy={{
            title: t("panelTitle"), tools: { distance: t("tools.distance"), angle: t("tools.angle"), circle: t("tools.circle") },
            measurement: t("measurement"), value, unit, pointsLabel: t("pointsLabel"),
            points: t("points", { count: measurementPreviewExample.points }), scaleLabel: t("scaleLabel"),
            calibrated: t("calibrated"), confirm: t("confirm"),
          }} />
          <MeasurementPreviewForegroundVeil idPrefix={idPrefix} surface="panel" />
        </svg>
      </div>
      <div className={styles.copy}>
        <h2 id="measurement-tools-preview-title">{t("title")}</h2>
        <p>{t("description")}</p>
      </div>
    </article>
  )
}

export { MeasurementToolsPreview }
