import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { LoginForm } from "@/features/auth/components/forms/login-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.metadata")
  return { title: t("login") }
}

type LoginPageProps = {
  searchParams: Promise<{ from?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { from } = await searchParams

  return <LoginForm redirectTo={typeof from === "string" ? from : undefined} />
}
