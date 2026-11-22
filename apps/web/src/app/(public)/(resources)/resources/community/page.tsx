import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { CommunityResourcePage } from "@/features/landing/components/resource-pages/community/community-page"
import { resourcePagePaths } from "@/features/landing/data/resource-routes"
import { getCanonicalUrl } from "@/lib/seo/public-routes"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("resourcePages.community.metadata")

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: getCanonicalUrl(resourcePagePaths.community) },
  }
}

export default function CommunityResource() {
  return <CommunityResourcePage />
}
