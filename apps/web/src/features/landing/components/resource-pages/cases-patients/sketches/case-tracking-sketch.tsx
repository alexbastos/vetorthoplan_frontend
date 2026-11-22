import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { casePreviewPatient } from "../cases-preview-patient-data"
import { CaseTrackingScene } from "./case-tracking-scene"

async function CaseTrackingSketch() {
  const t = await getTranslations("resourcePages.casesPatients.modules.items.tracking.sketch")

  return (
    <ResourceSketchMotion>
      <CaseTrackingScene copy={{ name: casePreviewPatient.name, status: t("status") }} />
    </ResourceSketchMotion>
  )
}

export { CaseTrackingSketch }
