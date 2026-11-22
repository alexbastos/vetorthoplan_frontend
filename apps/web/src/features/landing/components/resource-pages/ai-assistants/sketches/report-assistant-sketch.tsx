import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { ReportAssistantScene } from "./report-assistant-scene"

async function ReportAssistantSketch() {
  const t = await getTranslations("resourcePages.aiAssistants.modules.items.reports.sketch")

  return (
    <ResourceSketchMotion>
      <ReportAssistantScene draft={t("draft")} />
    </ResourceSketchMotion>
  )
}

export { ReportAssistantSketch }
