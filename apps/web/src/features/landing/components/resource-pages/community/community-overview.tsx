import { getTranslations } from "next-intl/server"

import { communityImage } from "../../../data/resource-media"
import { ResourceOverview } from "../resource-overview"

async function CommunityOverview() {
  const t = await getTranslations("resourcePages.community.overview")

  return (
    <ResourceOverview title={t("title")} lead={t("lead")} image={communityImage}>
      <p>{t("connections")}</p>
      <p>{t("context")}</p>
      <p>{t("perspectives")}</p>
    </ResourceOverview>
  )
}

export { CommunityOverview }
