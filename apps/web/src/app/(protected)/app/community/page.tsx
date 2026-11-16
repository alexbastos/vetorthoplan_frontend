import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { CommunityPage } from "@/features/community/components/community-page"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("community")
  return { title: t("title") }
}

export default async function ProtectedCommunityRoute({ searchParams }: {
  searchParams: Promise<{ demo?: string }>
}) {
  const { demo } = await searchParams
  return <CommunityPage key={demo === "empty" ? "empty" : "populated"} conversations={demo === "empty" ? [] : undefined} />
}
