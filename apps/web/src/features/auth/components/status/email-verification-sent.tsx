"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

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
      toast.error(t("connectionError"))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <section ref={sectionRef} aria-labelledby="email-verification-sent-title" className="mx-auto w-full max-w-sm space-y-4">
      {hasPendingEmail ? (
        <>
          <header className="space-y-2" data-email-verification-step>
            <h1 id="email-verification-sent-title" className="text-heading-4 text-capta-text-primary">
              {t("title")}
            </h1>
            <p className="text-ui text-capta-text-secondary">
              {t("description")}
            </p>
          </header>

          <div data-email-verification-step>
            <InputField
              readOnly
              tabIndex={-1}
              wrapperClassName="pointer-events-none select-none bg-[var(--input-surface-disabled)] focus-within:border-[var(--input-border-default)]"
              label={tFields("email")}
              value={maskEmail(email)}
            />
          </div>

          <div data-email-verification-step>
            <Button
              className="w-full"
              disabled={isTransitioning}
              onClick={() => navigateWithExit("/login")}
              type="button"
            >
              {t("confirmed")}
            </Button>
          </div>

          <p className="text-center text-ui text-capta-text-secondary" data-email-verification-step>
            {t("notReceived")}{" "}
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={isResending}
              className="cursor-pointer font-semibold text-capta-text-primary motion-interactive hover:underline focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending ? t("resending") : t("resend")}
            </button>
          </p>
        </>
      ) : (
        <>
          <header className="space-y-2" data-email-verification-step>
            <h1 id="email-verification-sent-title" className="text-heading-4 text-capta-text-primary">
              {t("missingTitle")}
            </h1>
            <p className="text-ui text-capta-text-secondary">
              {t("missingDescription")}
            </p>
          </header>

          <div data-email-verification-step>
            <Button
              className="w-full"
              disabled={isTransitioning}
              onClick={() => navigateWithExit("/login")}
              type="button"
            >
              {t("goToLogin")}
            </Button>
          </div>

          <p className="text-center text-ui text-capta-text-secondary" data-email-verification-step>
            {tShared("alreadyRegistered")}{" "}
            <AuthNavLink className="font-semibold text-capta-text-primary" href="/register">
              {tShared("createAccount")}
            </AuthNavLink>
          </p>
        </>
      )}
    </section>
  )
}

export { EmailVerificationSent }
