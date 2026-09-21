import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { HomePage } from "@/features/home"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home")
  return { title: t("metadataTitle") }
}

/** Rota de entrada canônica após a autenticação. */
export default function ProtectedAppHomeRoute() {
  return <HomePage />
}
