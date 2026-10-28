"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"

import { Button, buttonVariants } from "@/components/ui/button"
import { LoginHandoffPawLoader } from "@/components/shared/login-handoff/login-handoff-paw-loader"
import { LoginHandoffStatusText } from "@/components/shared/login-handoff/login-handoff-status-text"
import handoffStyles from "@/components/shared/login-handoff/login-handoff-overlay.module.css"
import { cn } from "@/lib/utils"

import { useEmailVerificationHandlerEntrance } from "../../hooks/animations/use-email-verification-handler-entrance"
import { useVerifyEmail, type EmailVerificationState } from "../../hooks/use-verify-email"
import { AuthNavLink } from "../navigation/auth-nav-link"

type EmailVerificationHandlerProps = {
  token?: string
}

function EmailVerificationHandler({ token }: EmailVerificationHandlerProps) {
  const t = useTranslations("auth.verification")
  const sectionRef = useRef<HTMLElement>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const { retry, state } = useVerifyEmail(token)

  useEmailVerificationHandlerEntrance({ scope: sectionRef, state })

  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  if (state === "resolving") {
    return (
      <section ref={sectionRef} aria-live="polite" className="sr-only" role="status">
        {t("resolving")}
      </section>
    )
  }

  if (state === "invalid-link") {
    return <InvalidVerificationLink sectionRef={sectionRef} />
  }

  if (state === "unavailable") {
    return <UnavailableVerification sectionRef={sectionRef} onRetry={retry} />
  }

  const loadingOverlay = (
    <section
      ref={sectionRef}
      aria-atomic="true"
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-workspace px-6 text-center"
      role="status"
    >
      <div className={handoffStyles.content}>
        <div data-email-verification-handler-step>
          <LoginHandoffPawLoader size={104} />
        </div>
        <div className={handoffStyles.status} data-email-verification-handler-step>
          <p className={handoffStyles.message}><LoginHandoffStatusText>{t("resolving")}</LoginHandoffStatusText></p>
        </div>
      </div>
    </section>
  )

  return portalTarget ? createPortal(loadingOverlay, portalTarget) : null
}

function InvalidVerificationLink({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  const t = useTranslations("auth.verification")
  const tShared = useTranslations("auth.shared")
  return (
    <section ref={sectionRef} aria-labelledby="invalid-verification-link-title" className="mx-auto w-full max-w-[26rem] space-y-6">
      <header className="space-y-2 text-center" data-email-verification-handler-step>
        <h1 id="invalid-verification-link-title" className="text-heading-2 text-foreground">
          {t("invalidTitle")}
        </h1>
        <p className="text-ui text-content-secondary">
          {t("invalidDescription")}
        </p>
      </header>

      <div data-email-verification-handler-step>
        <AuthNavLink className={cn(buttonVariants({ className: "w-full", variant: "pill" }))} href="/register">
          {t("requestNewLink")}
        </AuthNavLink>
      </div>

      <p className="text-center text-ui text-content-secondary" data-email-verification-handler-step>
        {tShared("alreadyRegistered")}{" "}
        <AuthNavLink className="font-medium text-foreground hover:underline" href="/login">
          {tShared("signIn")}
        </AuthNavLink>
      </p>
    </section>
  )
}

function UnavailableVerification({
  onRetry,
  sectionRef,
}: {
  onRetry: () => Promise<void>
  sectionRef: RefObject<HTMLElement | null>
}) {
  const t = useTranslations("auth.verification")
  const tCommon = useTranslations("common.actions")
  return (
    <section ref={sectionRef} aria-labelledby="unavailable-verification-title" className="mx-auto w-full max-w-[26rem] space-y-6">
      <header className="space-y-2 text-center" data-email-verification-handler-step>
        <h1 id="unavailable-verification-title" className="text-heading-2 text-foreground">
          {t("unavailableTitle")}
        </h1>
        <p className="text-ui text-content-secondary">
          {t("unavailableDescription")}
        </p>
      </header>

      <div data-email-verification-handler-step>
        <Button className="w-full" onClick={() => void onRetry()} type="button" variant="pill">
          {tCommon("retry")}
        </Button>
      </div>

      <p className="text-center text-ui text-content-secondary" data-email-verification-handler-step>
        <AuthNavLink className="font-medium text-foreground hover:underline" href="/login">
          {t("backToLogin")}
        </AuthNavLink>
      </p>
    </section>
  )
}

export { EmailVerificationHandler }
export type { EmailVerificationHandlerProps }
