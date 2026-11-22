import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { ReviewScene } from "./review-scene"

async function ReviewSketch() {
  const t = await getTranslations("resourcePages.visualSimulation.modules.items.review.sketch")

  return (
    <ResourceSketchMotion>
      <ReviewScene copy={{ original: t("original"), result: t("result"), save: t("save"), saved: t("saved") }} />
    </ResourceSketchMotion>
  )
}

export { ReviewSketch }
