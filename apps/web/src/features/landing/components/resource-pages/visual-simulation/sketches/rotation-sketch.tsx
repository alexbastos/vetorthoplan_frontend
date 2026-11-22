import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { RotationScene } from "./rotation-scene"
import { rotationSketchGeometry } from "./rotation-sketch-geometry"

async function RotationSketch() {
  const t = await getTranslations("resourcePages.visualSimulation.modules.items.rotation.sketch")

  return (
    <ResourceSketchMotion>
      <RotationScene value={t("value", { value: rotationSketchGeometry.degrees })} />
    </ResourceSketchMotion>
  )
}

export { RotationSketch }
