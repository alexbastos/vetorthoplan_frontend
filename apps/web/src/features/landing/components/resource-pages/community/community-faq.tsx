import { getTranslations } from "next-intl/server"

import { FaqSection } from "../../faq/faq-section"
import { communityFaqKeys } from "./community-content"

async function CommunityFaq() {
  const t = await getTranslations("resourcePages.community.faq")

  return (
    <FaqSection id="community-faq" eyebrow={t("eyebrow")} title={t("title")} variant="resource"
      items={communityFaqKeys.map(id => ({
        id, question: t(`items.${id}.question`), answer: t(`items.${id}.answer`),
      }))} />
  )
}

export { CommunityFaq }
