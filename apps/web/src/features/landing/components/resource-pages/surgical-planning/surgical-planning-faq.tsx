import { getTranslations } from "next-intl/server"

import { FaqSection } from "../../faq/faq-section"
import { surgicalPlanningFaqKeys } from "./surgical-planning-content"

async function SurgicalPlanningFaq() {
  const t = await getTranslations("resourcePages.surgicalPlanning.faq")

  return (
    <FaqSection id="surgical-planning-faq" eyebrow={t("eyebrow")} title={t("title")} variant="resource"
      items={surgicalPlanningFaqKeys.map(id => ({
        id,
        question: t(`items.${id}.question`),
        answer: t(`items.${id}.answer`),
      }))} />
  )
}

export { SurgicalPlanningFaq }
