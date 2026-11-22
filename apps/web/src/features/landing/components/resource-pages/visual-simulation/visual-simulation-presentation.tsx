import { getTranslations } from "next-intl/server"

import { ResourceFacts } from "../resource-facts"
import { ResourcePresentation } from "../resource-presentation"
import { visualSimulationFactKeys } from "./visual-simulation-content"
import { VisualSimulationPreview } from "./visual-simulation-preview"

async function VisualSimulationPresentation() {
  const [shared, t] = await Promise.all([
    getTranslations("resourcePages.shared"),
    getTranslations("resourcePages.visualSimulation"),
  ])
  const facts = visualSimulationFactKeys.map(id => ({
    id, label: t(`facts.items.${id}.label`), value: t(`facts.items.${id}.value`),
  }))

  return (
    <ResourcePresentation title={t("title")} tagline={t("tagline")}
      breadcrumbLabel={shared("breadcrumbLabel")} resourcesLabel={shared("resources")}
      facts={<ResourceFacts items={facts} note={t("facts.note")} />}>
      <VisualSimulationPreview />
    </ResourcePresentation>
  )
}

export { VisualSimulationPresentation }
