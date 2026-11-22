import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { DistanceScene } from "./distance-scene"

async function DistanceSketch() {
  const t = await getTranslations("resourcePages.measurementTools.modules.items.distance.sketch")

  return (
    <ResourceSketchMotion>
      <DistanceScene copy={{ value: t("value", { value: 42.6 }) }} />
    </ResourceSketchMotion>
  )
}

export { DistanceSketch }
