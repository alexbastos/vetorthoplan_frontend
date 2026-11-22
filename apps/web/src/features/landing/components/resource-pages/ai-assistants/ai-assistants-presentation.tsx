import { getTranslations } from "next-intl/server"

import { ResourceFacts } from "../resource-facts"
import { ResourcePresentation } from "../resource-presentation"
import { aiAssistantsFactKeys } from "./ai-assistants-content"
import { AiAssistantsPreview } from "./ai-assistants-preview"

async function AiAssistantsPresentation() {
  const [shared, t] = await Promise.all([
    getTranslations("resourcePages.shared"),
    getTranslations("resourcePages.aiAssistants"),
  ])
  const facts = aiAssistantsFactKeys.map(id => ({
    id, label: t(`facts.items.${id}.label`), value: t(`facts.items.${id}.value`),
  }))

  return (
    <ResourcePresentation title={t("title")} tagline={t("tagline")}
      breadcrumbLabel={shared("breadcrumbLabel")} resourcesLabel={shared("resources")}
      facts={<ResourceFacts items={facts} note={t("facts.note")} />}>
      <AiAssistantsPreview />
    </ResourcePresentation>
  )
}

export { AiAssistantsPresentation }
