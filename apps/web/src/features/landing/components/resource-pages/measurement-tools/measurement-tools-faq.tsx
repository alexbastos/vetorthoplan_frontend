import { getTranslations } from "next-intl/server"

import { FaqSection } from "../../faq/faq-section"
import { measurementFaqKeys } from "./measurement-tools-content"

async function MeasurementToolsFaq() {
  const t = await getTranslations("resourcePages.measurementTools.faq")

  return (
    <FaqSection id="measurement-tools-faq" eyebrow={t("eyebrow")} title={t("title")} variant="resource"
      items={measurementFaqKeys.map(id => ({
        id,
        question: t(`items.${id}.question`),
        answer: t(`items.${id}.answer`),
      }))} />
  )
}

export { MeasurementToolsFaq }
