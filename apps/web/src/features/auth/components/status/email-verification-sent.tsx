"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "@/lib/notifications"

import { Button } from "@/components/ui/button"
import { InputField } from "@/components/ui/input-field"

import { useEmailVerificationSentEntrance } from "../../hooks/animations/use-email-verification-sent-entrance"
import { useAuthTransitionNav } from "../../hooks/animations/use-auth-transition-nav"
import { authBffClient } from "../../services/auth-bff-client"
import { AuthNavLink } from "../navigation/auth-nav-link"
import { useAuthTransition } from "../shell/auth-transition-provider"

type EmailVerificationSentProps = {
  email?: string
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")

  if (local.length <= 2) {
    return `${local}*****@${domain}`
  }

  return `${local.slice(0, 2)}*****@${domain}`
}

function hasPendingVerificationEmail(email?: string): email is string {
  return typeof email === "string" && email.includes("@")
}

function EmailVerificationSent({ email }: EmailVerificationSentProps) {
  const t = useTranslations("auth.verificationSent")
  const tFields = useTranslations("auth.fields")
  const tShared = useTranslations("auth.shared")
  const sectionRef = useRef<HTMLElement>(null)
  const { navigateWithExit } = useAuthTransitionNav()
  const { isTransitioning } = useAuthTransition()
  const [isResending, setIsResending] = useState(false)

  useEmailVerificationSentEntrance(sectionRef)

  const hasPendingEmail = hasPendingVerificationEmail(email)

  const handleResendEmail = async () => {
    if (!hasPendingVerificationEmail(email) || isResending) return
    setIsResending(true)

    try {
      const result = await authBffClient.resendVerification({ email })
      if (result.ok) {
        toast.success(t("title"), {
          description: t("resendSuccessDescription"),
        })
      } else if (result.error.code === "RATE_LIMITED") {
        toast.info(t("rateLimitTitle"), {
          description: t("rateLimitDescription"),
        })
      } else {
        toast.error(t("resendErrorTitle"), {
          description: t("resendErrorDescription"),
        })
      }
    } catch {
      toast.error(t("connectionErrorTitle"), { description: t("connectionError") })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="email-verification-sent-title"
      className="mx-auto w-full max-w-[26rem] space-y-6"
    >
      {hasPendingEmail ? (
        <>
          <header className="space-y-2 text-center" data-email-verification-step>
            <h1 id="email-verification-sent-title" className="text-heading-2 text-foreground">
              {t("title")}
            </h1>
            <p className="text-ui text-content-secondary">
              {t("description")}
            </p>
          </header>

          <div data-email-verification-step>
            <InputField
              readOnly
              tabIndex={-1}
              aria-label={tFields("email")}
              showLabel={false}
              value={maskEmail(email)}
              variant="pill"
              wrapperClassName="pointer-events-none select-none"
            />
          </div>

          <p className="text-center text-ui text-content-secondary" data-email-verification-step>
            {t("notReceived")}{" "}
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={isResending}
              className="cursor-pointer font-semibold text-foreground motion-interactive hover:underline focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending ? t("resending") : t("resend")}
            </button>
          </p>
        </>
      ) : (
        <>
          <header className="space-y-2 text-center" data-email-verification-step>
            <h1 id="email-verification-sent-title" className="text-heading-2 text-foreground">
              {t("missingTitle")}
            </h1>
            <p className="text-ui text-content-secondary">
              {t("missingDescription")}
            </p>
          </header>

          <div data-email-verification-step>
            <Button
              className="w-full"
              disabled={isTransitioning}
              onClick={() => navigateWithExit("/login")}
              type="button"
              variant="pill"
            >
              {t("goToLogin")}
            </Button>
          </div>

          <p className="text-center text-ui text-content-secondary" data-email-verification-step>
            {tShared("alreadyRegistered")}{" "}
            <AuthNavLink className="font-semibold text-foreground" href="/register">
              {tShared("createAccount")}
            </AuthNavLink>
          </p>
        </>
      )}
    </section>
  )
}

export { EmailVerificationSent }
