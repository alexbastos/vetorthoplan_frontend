import { getTranslations } from "next-intl/server"
import type { ComponentType } from "react"

import { ResourceModules, ResourceModuleCard } from "../resource-modules"
import { ResourceSketchFrame } from "../resource-sketch-frame"
import { measurementModules, type MeasurementModuleId } from "./measurement-tools-content"
import { DistanceSketch } from "./sketches/distance-sketch"
import { AngleSketch } from "./sketches/angle-sketch"
import { CircleSketch } from "./sketches/circle-sketch"

const moduleSketches: Record<MeasurementModuleId, ComponentType> = {
  distance: DistanceSketch,
  angle: AngleSketch,
  circle: CircleSketch,
}

async function MeasurementToolsModules() {
  const t = await getTranslations("resourcePages.measurementTools.modules")

  return (
    <ResourceModules title={t("title")}
      description={t.rich("description", { strong: chunks => <strong>{chunks}</strong> })}>
      {measurementModules.map(({ id, code }, index) => {
        const Sketch = moduleSketches[id]

        return (
          <ResourceModuleCard key={id} title={t(`items.${id}.title`)}
            description={t(`items.${id}.description`)} delay={index * 0.1}>
            <ResourceSketchFrame code={code}>
              <Sketch />
            </ResourceSketchFrame>
          </ResourceModuleCard>
        )
      })}
    </ResourceModules>
  )
}

export { MeasurementToolsModules }
