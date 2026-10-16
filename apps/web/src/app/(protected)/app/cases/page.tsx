import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { CasesPage } from "@/features/cases"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cases")
  return { title: t("metadataTitle") }
}

export default function CasesRoute() {
  return <CasesPage />
}
