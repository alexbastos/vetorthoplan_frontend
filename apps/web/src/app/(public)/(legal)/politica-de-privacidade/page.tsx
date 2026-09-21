import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { LegalDocumentBody } from "@/features/legal/components/legal-document-body"
import { LegalDocumentShell } from "@/features/legal/components/legal-document-shell"
import { getPrivacyPolicyContent } from "@/features/legal/data/privacy-policy-content"
import { getCanonicalUrl } from "@/lib/seo/public-routes"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.documents")
  return {
    title: t("privacy"),
    alternates: { canonical: getCanonicalUrl("/politica-de-privacidade") },
  }
}

export default async function PrivacyPolicyPage() {
  const locale = await getLocale()
  const content = getPrivacyPolicyContent(locale)

  return (
    <LegalDocumentShell
      document="privacy"
      language={content.language}
      lastUpdated={content.lastUpdated}
      title={content.title}
    >
      <LegalDocumentBody blocks={content.blocks} />
    </LegalDocumentShell>
  )
}
