import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { EmailVerificationHandler } from "@/features/auth/components/status/email-verification-handler"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.metadata")
  return { robots: { follow: false, index: false }, title: t("verifyEmail") }
}

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams

  return <EmailVerificationHandler token={typeof token === "string" ? token : undefined} />
}
