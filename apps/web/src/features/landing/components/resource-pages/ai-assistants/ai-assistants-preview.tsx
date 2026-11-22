import { getTranslations } from "next-intl/server"

import { ResourcePreviewBackdrop, ResourcePreviewVeil } from "../resource-preview-backdrop"
import { resourcePreviewFonts } from "../resource-preview-fonts"
import { casePreviewPatient as patient } from "../cases-patients/cases-preview-patient-data"
import { AssistantsWorkflow } from "./assistants-workflow"
import styles from "./ai-assistants-preview.module.css"

async function AiAssistantsPreview() {
  const t = await getTranslations("resourcePages.aiAssistants.preview")
  const idPrefix = "ai-assistants-preview"

  return (
    <article className={`${styles.frame} ${resourcePreviewFonts}`} aria-labelledby="ai-assistants-preview-title">
      <div aria-hidden="true" className={styles.visual}>
        <svg className={styles.artwork} fill="none" viewBox="0 0 629 427">
          <ResourcePreviewBackdrop idPrefix={idPrefix} />
          <ResourcePreviewVeil idPrefix={idPrefix} />
        </svg>
        <div className={styles.workflowViewport}>
          <AssistantsWorkflow idPrefix={`${idPrefix}-workflow`} copy={{
            case: { title: t("workflow.case.title"), description: t("workflow.case.description", { name: patient.name, caseId: patient.caseId }) },
            context: { title: t("workflow.context.title"), description: t("workflow.context.description") },
            notes: { title: t("workflow.notes.title"), description: t("workflow.notes.description") },
            draft: { title: t("workflow.draft.title"), description: t("workflow.draft.description") },
            review: { title: t("workflow.review.title"), description: t("workflow.review.description") },
            action: t("workflow.action"),
          }} />
        </div>
      </div>
      <div className={styles.copy}>
        <h2 id="ai-assistants-preview-title">{t("title")}</h2>
        <p>{t("description")}</p>
      </div>
    </article>
  )
}

export { AiAssistantsPreview }
