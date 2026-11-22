import { getTranslations } from "next-intl/server"

import { FaqSection } from "../../faq/faq-section"
import { aiAssistantsFaqKeys } from "./ai-assistants-content"

async function AiAssistantsFaq() {
  const t = await getTranslations("resourcePages.aiAssistants.faq")

  return (
    <FaqSection id="ai-assistants-faq" eyebrow={t("eyebrow")} title={t("title")} variant="resource"
      items={aiAssistantsFaqKeys.map(id => ({
        id,
        question: t(`items.${id}.question`),
        answer: t(`items.${id}.answer`),
      }))} />
  )
}

export { AiAssistantsFaq }
