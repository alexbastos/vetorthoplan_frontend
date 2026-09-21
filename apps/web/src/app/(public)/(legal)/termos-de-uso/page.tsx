import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { LegalDocumentBody } from "@/features/legal/components/legal-document-body"
import { LegalDocumentShell } from "@/features/legal/components/legal-document-shell"
import { getTermsOfUseContent } from "@/features/legal/data/terms-of-use-content"
import { getCanonicalUrl } from "@/lib/seo/public-routes"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.documents")
  return {
    title: t("terms"),
    alternates: { canonical: getCanonicalUrl("/termos-de-uso") },
  }
}

export default async function TermsOfUsePage() {
  const locale = await getLocale()
  const content = getTermsOfUseContent(locale)

  return (
    <LegalDocumentShell
      document="terms"
      language={content.language}
      lastUpdated={content.lastUpdated}
      title={content.title}
    >
      <LegalDocumentBody blocks={content.blocks} />
    </LegalDocumentShell>
  )
}
