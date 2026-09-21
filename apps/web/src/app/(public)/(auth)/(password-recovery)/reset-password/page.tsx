import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { ResetPasswordForm } from "@/features/auth/components/forms/reset-password-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.metadata")
  return { robots: { follow: false, index: false }, title: t("resetPassword") }
}

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams
  const resetToken = typeof token === "string" ? token.trim() : undefined

  if (!resetToken) {
    redirect("/forgot-password")
  }

  return <ResetPasswordForm token={resetToken} />
}
