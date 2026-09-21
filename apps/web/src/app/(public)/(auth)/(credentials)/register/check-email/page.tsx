import type { Metadata } from "next"
import { cookies } from "next/headers"
import { getTranslations } from "next-intl/server"

import { EmailVerificationSent } from "@/features/auth/components/status/email-verification-sent"
import { PENDING_VERIFICATION_EMAIL_COOKIE_NAME } from "@/lib/auth-constants"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.metadata")
  return { title: t("checkEmail") }
}

export default async function EmailVerificationSentPage() {
  const cookieStore = await cookies()
  const email = cookieStore.get(PENDING_VERIFICATION_EMAIL_COOKIE_NAME)?.value

  return <EmailVerificationSent email={email} />
}
