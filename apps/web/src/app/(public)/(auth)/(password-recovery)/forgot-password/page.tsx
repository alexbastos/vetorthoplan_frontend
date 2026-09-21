import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ForgotPasswordForm } from "@/features/auth/components/forms/forgot-password-form"
import { redirectAuthenticatedUser } from "@/lib/server/redirect-authenticated-user"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.metadata")
  return { title: t("forgotPassword") }
}

export default async function ForgotPasswordPage() {
  await redirectAuthenticatedUser()

  return <ForgotPasswordForm />
}
