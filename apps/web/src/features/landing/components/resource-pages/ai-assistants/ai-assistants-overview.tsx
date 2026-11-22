import { getTranslations } from "next-intl/server"

import { aiAssistantsImage } from "../../../data/resource-media"
import { ResourceOverview } from "../resource-overview"

async function AiAssistantsOverview() {
  const t = await getTranslations("resourcePages.aiAssistants.overview")

  return (
    <ResourceOverview title={t("title")} lead={t("lead")} image={aiAssistantsImage}>
      <p>{t("specialists")}</p>
      <p>{t("workflows")}</p>
      <p>{t("review")}</p>
    </ResourceOverview>
  )
}

export { AiAssistantsOverview }
