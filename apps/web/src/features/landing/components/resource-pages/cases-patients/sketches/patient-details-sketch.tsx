import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { casePreviewPatient as patient } from "../cases-preview-patient-data"
import { PatientDetailsScene } from "./patient-details-scene"

async function PatientDetailsSketch() {
  const t = await getTranslations("resourcePages.casesPatients.modules.items.patient.sketch")

  return (
    <ResourceSketchMotion>
      <PatientDetailsScene copy={{ name: t("patientSummary", { name: patient.name, years: patient.age }), save: t("save") }} />
    </ResourceSketchMotion>
  )
}

export { PatientDetailsSketch }
