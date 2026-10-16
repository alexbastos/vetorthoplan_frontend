import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { NewCasePage } from "@/features/cases"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cases")
  return { title: t("newCaseMetadataTitle") }
}

export default function NewCaseRoute() {
  return <NewCasePage />
}
