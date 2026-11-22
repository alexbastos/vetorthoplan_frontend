import { getTranslations } from "next-intl/server"

import { ResourceSketchMotion } from "../../sketches/resource-sketch-motion"
import { FilesDocumentsScene } from "./files-documents-scene"

async function FilesDocumentsSketch() {
  const t = await getTranslations("resourcePages.casesPatients.modules.items.files.sketch")

  return (
    <ResourceSketchMotion>
      <FilesDocumentsScene copy={{ caseLabel: t("caseLabel"), image: t("image"), document: t("document"), note: t("note") }} />
    </ResourceSketchMotion>
  )
}

export { FilesDocumentsSketch }
