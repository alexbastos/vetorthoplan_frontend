import type { AppLocale } from "@/i18n/config"

import type { LegalDocumentContent } from "./legal-document-content"
import { privacyPolicyContentEn } from "./privacy-policy-content.en"
import { privacyPolicyContentPtBR } from "./privacy-policy-content.pt-BR"

const privacyPolicyContentByLocale = {
  "pt-BR": privacyPolicyContentPtBR,
  en: privacyPolicyContentEn,
} satisfies Record<AppLocale, LegalDocumentContent>

function getPrivacyPolicyContent(locale: AppLocale): LegalDocumentContent {
  return privacyPolicyContentByLocale[locale]
}

export { getPrivacyPolicyContent }
