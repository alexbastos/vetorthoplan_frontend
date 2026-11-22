import { getTranslations } from "next-intl/server"

import { FaqSection } from "../../faq/faq-section"
import { visualSimulationFaqKeys } from "./visual-simulation-content"

async function VisualSimulationFaq() {
  const t = await getTranslations("resourcePages.visualSimulation.faq")

  return (
    <FaqSection id="visual-simulation-faq" eyebrow={t("eyebrow")} title={t("title")} variant="resource"
      items={visualSimulationFaqKeys.map(id => ({
        id,
        question: t(`items.${id}.question`),
        answer: t(`items.${id}.answer`),
      }))} />
  )
}

export { VisualSimulationFaq }
