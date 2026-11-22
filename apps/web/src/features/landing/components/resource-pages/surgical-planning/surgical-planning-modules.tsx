import { getTranslations } from "next-intl/server"
import type { ComponentType } from "react"

import { ResourceModules, ResourceModuleCard } from "../resource-modules"
import { ResourceSketchFrame } from "../resource-sketch-frame"
import { surgicalPlanningModules, type SurgicalPlanningModuleId } from "./surgical-planning-content"
import { AxesSketch } from "./sketches/axes-sketch"
import { OrientationSketch } from "./sketches/orientation-sketch"
import { OsteotomySketch } from "./sketches/osteotomy-sketch"

const moduleSketches: Record<SurgicalPlanningModuleId, ComponentType> = {
  axes: AxesSketch,
  orientation: OrientationSketch,
  osteotomy: OsteotomySketch,
}

async function SurgicalPlanningModules() {
  const t = await getTranslations("resourcePages.surgicalPlanning.modules")

  return (
    <ResourceModules title={t("title")}
      description={t.rich("description", { strong: chunks => <strong>{chunks}</strong> })}>
      {surgicalPlanningModules.map(({ id, code }, index) => {
        const Sketch = moduleSketches[id]
        return (
          <ResourceModuleCard key={id} title={t(`items.${id}.title`)}
            description={t(`items.${id}.description`)} delay={index * 0.1}>
            <ResourceSketchFrame code={code}><Sketch /></ResourceSketchFrame>
          </ResourceModuleCard>
        )
      })}
    </ResourceModules>
  )
}

export { SurgicalPlanningModules }
