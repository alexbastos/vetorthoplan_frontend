import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { MeasurementToolsPage } from "@/features/landing/components/resource-pages/measurement-tools/measurement-tools-page"
import { resourcePagePaths } from "@/features/landing/data/resource-routes"
import { getCanonicalUrl } from "@/lib/seo/public-routes"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("resourcePages.measurementTools.metadata")

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: getCanonicalUrl(resourcePagePaths.measurements) },
  }
}

export default function MeasurementTools() {
  return <MeasurementToolsPage />
}
