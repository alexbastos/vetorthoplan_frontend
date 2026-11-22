import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { SurgicalPlanningPage } from "@/features/landing/components/resource-pages/surgical-planning/surgical-planning-page"
import { resourcePagePaths } from "@/features/landing/data/resource-routes"
import { getCanonicalUrl } from "@/lib/seo/public-routes"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("resourcePages.surgicalPlanning.metadata")

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: getCanonicalUrl(resourcePagePaths.methods) },
  }
}

export default function SurgicalPlanning() {
  return <SurgicalPlanningPage />
}
