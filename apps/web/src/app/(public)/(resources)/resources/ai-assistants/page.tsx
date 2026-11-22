import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { AiAssistantsPage } from "@/features/landing/components/resource-pages/ai-assistants/ai-assistants-page"
import { resourcePagePaths } from "@/features/landing/data/resource-routes"
import { getCanonicalUrl } from "@/lib/seo/public-routes"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("resourcePages.aiAssistants.metadata")

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: getCanonicalUrl(resourcePagePaths.assistants) },
  }
}

export default function AiAssistants() {
  return <AiAssistantsPage />
}
