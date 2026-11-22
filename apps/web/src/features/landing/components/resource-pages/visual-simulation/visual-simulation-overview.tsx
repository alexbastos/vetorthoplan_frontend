import { getTranslations } from "next-intl/server"

import { visualSimulationImage } from "../../../data/resource-media"
import { ResourceOverview } from "../resource-overview"

async function VisualSimulationOverview() {
  const t = await getTranslations("resourcePages.visualSimulation.overview")

  return (
    <ResourceOverview title={t("title")} lead={t("lead")} image={visualSimulationImage}>
      <p>{t("fragment")}</p>
      <p>{t("rotation")}</p>
      <p>{t("review")}</p>
    </ResourceOverview>
  )
}

export { VisualSimulationOverview }
