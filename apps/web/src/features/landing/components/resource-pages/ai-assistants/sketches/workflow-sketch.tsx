import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { WorkflowScene } from "./workflow-scene"

async function WorkflowSketch() {
  const t = await getTranslations("resourcePages.aiAssistants.modules.items.workflows.sketch")

  return (
    <ResourceSketchMotion>
      <WorkflowScene copy={{ organize: t("organize"), prepare: t("prepare"), review: t("review") }} />
    </ResourceSketchMotion>
  )
}

export { WorkflowSketch }
