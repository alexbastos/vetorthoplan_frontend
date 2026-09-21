import type { AppLocale } from "@/i18n/config"

import type { LegalDocumentContent } from "./legal-document-content"
import { termsOfUseContentEn } from "./terms-of-use-content.en"
import { termsOfUseContentPtBR } from "./terms-of-use-content.pt-BR"

const termsOfUseContentByLocale = {
  "pt-BR": termsOfUseContentPtBR,
  en: termsOfUseContentEn,
} satisfies Record<AppLocale, LegalDocumentContent>

function getTermsOfUseContent(locale: AppLocale): LegalDocumentContent {
  return termsOfUseContentByLocale[locale]
}

export { getTermsOfUseContent }
