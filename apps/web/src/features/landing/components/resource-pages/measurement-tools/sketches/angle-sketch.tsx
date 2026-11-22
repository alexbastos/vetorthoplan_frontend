import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { AngleScene } from "./angle-scene"
import { angleSketchGeometry } from "./angle-sketch-geometry"

async function AngleSketch() {
  const t = await getTranslations("resourcePages.measurementTools.modules.items.angle.sketch")

  return (
    <ResourceSketchMotion>
      <AngleScene copy={{ value: t("value", { value: angleSketchGeometry.degrees }) }} />
    </ResourceSketchMotion>
  )
}

export { AngleSketch }
