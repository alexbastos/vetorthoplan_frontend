import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { AxesScene } from "./axes-scene"

async function AxesSketch() {
  const t = await getTranslations("resourcePages.surgicalPlanning.modules.items.axes.sketch")
  return <ResourceSketchMotion><AxesScene value={t("axis")} /></ResourceSketchMotion>
}

export { AxesSketch }
