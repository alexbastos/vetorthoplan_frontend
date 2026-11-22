import { getTranslations } from "next-intl/server"

import { casesPatientsImage } from "../../../data/resource-media"
import { ResourceFacts } from "../resource-facts"
import { ResourceModules, ResourceModuleCard } from "../resource-modules"
import { ResourceOverview } from "../resource-overview"
import { ResourcePresentation } from "../resource-presentation"
import { ResourceSketchFrame } from "../resource-sketch-frame"
import { CasesPatientsFaq } from "./cases-patients-faq"
import { CasesPreviewCard } from "./cases-preview-card"
import { PatientDetailsSketch } from "./sketches/patient-details-sketch"
import { FilesDocumentsSketch } from "./sketches/files-documents-sketch"
import { CaseTrackingSketch } from "./sketches/case-tracking-sketch"

const factKeys = ["patient", "files", "notes", "progress"] as const

const modules = [
  { id: "patient", code: "CP-01", Sketch: PatientDetailsSketch },
  { id: "files", code: "CP-02", Sketch: FilesDocumentsSketch },
  { id: "tracking", code: "CP-03", Sketch: CaseTrackingSketch },
] as const

async function CasesPatientsPage() {
  const [shared, t] = await Promise.all([
    getTranslations("resourcePages.shared"),
    getTranslations("resourcePages.casesPatients"),
  ])
  const facts = factKeys.map(id => ({
    id,
    label: t(`facts.items.${id}.label`),
    value: t(`facts.items.${id}.value`),
  }))

  return (
    <>
      <ResourcePresentation title={t("title")} tagline={t("tagline")}
        breadcrumbLabel={shared("breadcrumbLabel")} resourcesLabel={shared("resources")}
        facts={<ResourceFacts items={facts} note={t("facts.note")} />}>
        <CasesPreviewCard />
      </ResourcePresentation>
      <ResourceOverview title={t("overview.title")} lead={t("overview.context")} image={casesPatientsImage}>
        <p>{t("overview.organization")}</p>
        <p>{t("overview.files")}</p>
        <p>{t("overview.continuity")}</p>
      </ResourceOverview>
      <ResourceModules title={t("modules.title")}
        description={t.rich("modules.description", { strong: chunks => <strong>{chunks}</strong> })}>
        {modules.map(({ id, code, Sketch }, index) => (
          <ResourceModuleCard key={id} title={t(`modules.items.${id}.title`)} delay={index * 0.1}
            description={t(`modules.items.${id}.description`)}>
            <ResourceSketchFrame code={code}>
              <Sketch />
            </ResourceSketchFrame>
          </ResourceModuleCard>
        ))}
      </ResourceModules>
      <CasesPatientsFaq />
    </>
  )
}

export { CasesPatientsPage }
