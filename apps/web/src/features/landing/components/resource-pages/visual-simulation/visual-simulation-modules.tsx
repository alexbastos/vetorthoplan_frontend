import { getTranslations } from "next-intl/server"
import type { ComponentType } from "react"

import { ResourceModules, ResourceModuleCard } from "../resource-modules"
import { ResourceSketchFrame } from "../resource-sketch-frame"
import { visualSimulationModules, type VisualSimulationModuleId } from "./visual-simulation-content"
import { FragmentSketch } from "./sketches/fragment-sketch"
import { RotationSketch } from "./sketches/rotation-sketch"
import { ReviewSketch } from "./sketches/review-sketch"

const moduleSketches: Record<VisualSimulationModuleId, ComponentType> = {
  fragment: FragmentSketch,
  rotation: RotationSketch,
  review: ReviewSketch,
}

async function VisualSimulationModules() {
  const t = await getTranslations("resourcePages.visualSimulation.modules")

  return (
    <ResourceModules title={t("title")}
      description={t.rich("description", { strong: chunks => <strong>{chunks}</strong> })}>
      {visualSimulationModules.map(({ id, code }, index) => {
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

export { VisualSimulationModules }
