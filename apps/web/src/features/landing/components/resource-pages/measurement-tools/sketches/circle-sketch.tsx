import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { CircleScene } from "./circle-scene"
import { circleSketchGeometry } from "./circle-sketch-geometry"

async function CircleSketch() {
  const t = await getTranslations("resourcePages.measurementTools.modules.items.circle.sketch")

  return (
    <ResourceSketchMotion>
      <CircleScene copy={{ value: t("value", { value: circleSketchGeometry.radiusMillimeters }) }} />
    </ResourceSketchMotion>
  )
}

export { CircleSketch }
