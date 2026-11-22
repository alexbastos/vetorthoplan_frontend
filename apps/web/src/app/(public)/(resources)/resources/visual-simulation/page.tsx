import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { VisualSimulationPage } from "@/features/landing/components/resource-pages/visual-simulation/visual-simulation-page"
import { resourcePagePaths } from "@/features/landing/data/resource-routes"
import { getCanonicalUrl } from "@/lib/seo/public-routes"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("resourcePages.visualSimulation.metadata")

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: getCanonicalUrl(resourcePagePaths.simulation) },
  }
}

export default function VisualSimulation() {
  return <VisualSimulationPage />
}
