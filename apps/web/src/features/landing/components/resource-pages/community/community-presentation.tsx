import { getTranslations } from "next-intl/server"

import { ResourceFacts } from "../resource-facts"
import { ResourcePresentation } from "../resource-presentation"
import { communityFactKeys } from "./community-content"
import { CommunityPreview } from "./community-preview"

async function CommunityPresentation() {
  const [shared, t] = await Promise.all([
    getTranslations("resourcePages.shared"),
    getTranslations("resourcePages.community"),
  ])
  const facts = communityFactKeys.map(id => ({
    id, label: t(`facts.items.${id}.label`), value: t(`facts.items.${id}.value`),
  }))

  return (
    <ResourcePresentation title={t("title")} tagline={t("tagline")}
      breadcrumbLabel={shared("breadcrumbLabel")} resourcesLabel={shared("resources")}
      facts={<ResourceFacts items={facts} note={t("facts.note")} />}>
      <CommunityPreview />
    </ResourcePresentation>
  )
}

export { CommunityPresentation }
