import { getTranslations } from "next-intl/server"
import type { ComponentType } from "react"

import { ResourceModules, ResourceModuleCard } from "../resource-modules"
import { ResourceSketchFrame } from "../resource-sketch-frame"
import { aiAssistantsModules, type AiAssistantsModuleId } from "./ai-assistants-content"
import { CaseAssistantSketch } from "./sketches/case-assistant-sketch"
import { ReportAssistantSketch } from "./sketches/report-assistant-sketch"
import { WorkflowSketch } from "./sketches/workflow-sketch"

const moduleSketches: Record<AiAssistantsModuleId, ComponentType> = {
  reports: ReportAssistantSketch,
  cases: CaseAssistantSketch,
  workflows: WorkflowSketch,
}

async function AiAssistantsModules() {
  const t = await getTranslations("resourcePages.aiAssistants.modules")

  return (
    <ResourceModules title={t("title")}
      description={t.rich("description", { strong: chunks => <strong>{chunks}</strong> })}>
      {aiAssistantsModules.map(({ id, code }, index) => {
        const Sketch = moduleSketches[id]
        return (
          <ResourceModuleCard key={id} title={t(`items.${id}.title`)}
            description={t(`items.${id}.description`)} delay={index * .1}>
            <ResourceSketchFrame code={code}><Sketch /></ResourceSketchFrame>
          </ResourceModuleCard>
        )
      })}
    </ResourceModules>
  )
}

export { AiAssistantsModules }
