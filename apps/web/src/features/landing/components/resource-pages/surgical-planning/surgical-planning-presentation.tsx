import { getTranslations } from "next-intl/server"

import { ResourceFacts } from "../resource-facts"
import { ResourcePresentation } from "../resource-presentation"
import { surgicalPlanningFactKeys } from "./surgical-planning-content"
import { SurgicalPlanningPreview } from "./surgical-planning-preview"

async function SurgicalPlanningPresentation() {
  const [shared, t] = await Promise.all([
    getTranslations("resourcePages.shared"),
    getTranslations("resourcePages.surgicalPlanning"),
  ])
  const facts = surgicalPlanningFactKeys.map(id => ({
    id, label: t(`facts.items.${id}.label`), value: t(`facts.items.${id}.value`),
  }))

  return (
    <ResourcePresentation title={t("title")} tagline={t("tagline")}
      breadcrumbLabel={shared("breadcrumbLabel")} resourcesLabel={shared("resources")}
      facts={<ResourceFacts items={facts} note={t("facts.note")} />}>
      <SurgicalPlanningPreview />
    </ResourcePresentation>
  )
}

export { SurgicalPlanningPresentation }
