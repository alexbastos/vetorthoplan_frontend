import { getTranslations } from "next-intl/server"

import { surgicalPlanningImage } from "../../../data/resource-media"
import { ResourceOverview } from "../resource-overview"

async function SurgicalPlanningOverview() {
  const t = await getTranslations("resourcePages.surgicalPlanning.overview")

  return (
    <ResourceOverview title={t("title")} lead={t("lead")} image={surgicalPlanningImage}>
      <p>{t("references")}</p>
      <p>{t("methods")}</p>
      <p>{t("review")}</p>
    </ResourceOverview>
  )
}

export { SurgicalPlanningOverview }
