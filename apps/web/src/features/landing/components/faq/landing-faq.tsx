import { getTranslations } from "next-intl/server"

import { FaqSection } from "./faq-section"
import { landingFaqKeys } from "./landing-faq-content"

// Page-specific copy stays separate from the shared layout and disclosures.
async function LandingFaq() {
  const t = await getTranslations("orthovetLanding.faq")

  return (
    <FaqSection id="faq" eyebrow={t("eyebrow")} title={t("title")} variant="default"
      items={landingFaqKeys.map(id => ({
        id,
        question: t(`items.${id}.question`),
        answer: t(`items.${id}.answer`),
      }))} />
  )
}

export { LandingFaq }
