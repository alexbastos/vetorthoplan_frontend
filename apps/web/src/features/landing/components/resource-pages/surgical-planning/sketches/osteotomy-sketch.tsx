import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { OsteotomyScene } from "./osteotomy-scene"
import { planningOsteotomy } from "./planning-sketch-geometry"

async function OsteotomySketch() {
  const t = await getTranslations("resourcePages.surgicalPlanning.modules.items.osteotomy.sketch")
  return (
    <ResourceSketchMotion>
      <OsteotomyScene value={t("value", { value: planningOsteotomy.radiusMillimeters })} reference={t("reference")} />
    </ResourceSketchMotion>
  )
}

export { OsteotomySketch }
