import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { SettingsPage } from "@/features/settings"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings")
  return { title: t("metadataTitle") }
}

export default function SettingsRoute() {
  return <SettingsPage />
}
