import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { OrientationScene } from "./orientation-scene"
import { planningTpaGeometry } from "./planning-tpa-geometry"

async function OrientationSketch() {
  const t = await getTranslations("resourcePages.surgicalPlanning.modules.items.orientation.sketch")
  return <ResourceSketchMotion><OrientationScene value={t("value", { value: planningTpaGeometry.tpaDegrees })} /></ResourceSketchMotion>
}

export { OrientationSketch }
