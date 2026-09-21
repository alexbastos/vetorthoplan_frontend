import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { RegisterForm } from "@/features/auth/components/forms/register-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.metadata")
  return { title: t("register") }
}

export default function RegisterPage() {
  return <RegisterForm />
}
