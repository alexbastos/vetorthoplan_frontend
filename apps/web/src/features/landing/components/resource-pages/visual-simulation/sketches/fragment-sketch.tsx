import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { FragmentScene } from "./fragment-scene"

async function FragmentSketch() {
  const t = await getTranslations("resourcePages.visualSimulation.modules.items.fragment.sketch")

  return <ResourceSketchMotion><FragmentScene label={t("label")} /></ResourceSketchMotion>
}

export { FragmentSketch }
