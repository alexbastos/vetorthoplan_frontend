import { getTranslations } from "next-intl/server"

import { ResourceFacts } from "../resource-facts"
import { ResourcePresentation } from "../resource-presentation"
import { measurementFactKeys } from "./measurement-tools-content"
import { MeasurementToolsPreview } from "./measurement-tools-preview"

async function MeasurementToolsPresentation() {
  const [shared, t] = await Promise.all([
    getTranslations("resourcePages.shared"),
    getTranslations("resourcePages.measurementTools"),
  ])
  const facts = measurementFactKeys.map(id => ({
    id, label: t(`facts.items.${id}.label`), value: t(`facts.items.${id}.value`),
  }))

  return (
    <ResourcePresentation title={t("title")} tagline={t("tagline")}
      breadcrumbLabel={shared("breadcrumbLabel")} resourcesLabel={shared("resources")}
      facts={<ResourceFacts items={facts} note={t("facts.note")} />}>
      <MeasurementToolsPreview />
    </ResourcePresentation>
  )
}

export { MeasurementToolsPresentation }
