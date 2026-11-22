import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { CasesPatientsPage } from "@/features/landing/components/resource-pages/cases-patients/cases-patients-page"
import { resourcePagePaths } from "@/features/landing/data/resource-routes"
import { getCanonicalUrl } from "@/lib/seo/public-routes"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("resourcePages.casesPatients.metadata")

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: getCanonicalUrl(resourcePagePaths.cases) },
  }
}

export default function CasesAndPatients() {
  return <CasesPatientsPage />
}
