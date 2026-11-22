import { getTranslations } from "next-intl/server"

import { FaqSection } from "../../faq/faq-section"

const questionKeys = ["information", "files", "search", "progress"] as const

async function CasesPatientsFaq() {
  const t = await getTranslations("resourcePages.casesPatients.faq")

  return (
    <FaqSection id="cases-patients-faq" eyebrow={t("eyebrow")} title={t("title")} variant="resource"
      items={questionKeys.map(id => ({
        id,
        question: t(`items.${id}.question`),
        answer: t(`items.${id}.answer`),
      }))} />
  )
}

export { CasesPatientsFaq }
