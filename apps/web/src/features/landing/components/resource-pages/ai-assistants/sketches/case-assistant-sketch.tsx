import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { CaseAssistantScene } from "./case-assistant-scene"

async function CaseAssistantSketch() {
  const t = await getTranslations("resourcePages.aiAssistants.modules.items.cases.sketch")

  return (
    <ResourceSketchMotion>
      <CaseAssistantScene copy={{ prompt: t("prompt"), summary: t("summary") }} />
    </ResourceSketchMotion>
  )
}

export { CaseAssistantSketch }
