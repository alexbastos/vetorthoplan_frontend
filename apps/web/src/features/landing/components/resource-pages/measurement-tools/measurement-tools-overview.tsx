import { getTranslations } from "next-intl/server"

import { measurementToolsImage } from "../../../data/resource-media"
import { ResourceOverview } from "../resource-overview"

async function MeasurementToolsOverview() {
  const t = await getTranslations("resourcePages.measurementTools.overview")

  return (
    <ResourceOverview title={t("title")} lead={t("lead")} image={measurementToolsImage}>
      <p>{t("calibration")}</p>
      <p>{t("references")}</p>
      <p>{t("review")}</p>
    </ResourceOverview>
  )
}

export { MeasurementToolsOverview }
