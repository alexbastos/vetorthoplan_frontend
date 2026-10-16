"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { CaptaBrandLogo } from "@/components/ui/capta-brand-logo"
import { appVersion } from "@/lib/app-version"
import { cn } from "@/lib/utils"

import { AuthBackLink } from "../navigation/auth-back-link"
import { RegistrationCreationLoader } from "../status/registration-creation-loader"
import { AuthPageMotion, useAuthPageEntered } from "./auth-page-motion"
import { AuthTransitionProvider, useAuthTransition } from "./auth-transition-provider"
import { AuthSourceIndicator } from "../showcase/auth-source-indicator"
import { EditalScannerAnimation } from "../showcase/edital-scanner-animation"
import { useAuthShellStaticState } from "../../hooks/animations/use-auth-shell-static-state"
import { useRegistrationConfirmationAnimation } from "../../hooks/animations/use-registration-confirmation-animation"

type AuthPageShellProps = {
  children: ReactNode
  className?: string
  footer?: ReactNode
}

function AuthPageShell({ children, className, footer }: AuthPageShellProps) {
  return (
    <AuthTransitionProvider>
      <AuthPageShellContent className={className} footer={footer}>
        {children}
      </AuthPageShellContent>
    </AuthTransitionProvider>
  )
}

function AuthPageShellContent({ children, className, footer }: AuthPageShellProps) {
  return (
    <AuthPageMotion>
      <AuthPageShellStage className={className} footer={footer}>
        {children}
      </AuthPageShellStage>
    </AuthPageMotion>
  )
}

function AuthPageShellStage({ children, className, footer }: AuthPageShellProps) {
  const t = useTranslations("auth.shell")
  const { phase, registrationConfirmationState, targetVisualMode, visualMode } = useAuthTransition()
  const hasEntered = useAuthPageEntered()
  const isCenteredStage = visualMode !== "split"
  const isTransitioningToSplit =
    targetVisualMode === "split" && (phase === "exiting" || phase === "navigating")
  const isSplitVisible = visualMode === "split" || isTransitioningToSplit
  const isCenteredStageContentVisible = isCenteredStage && !isTransitioningToSplit
  const isRegistrationConfirmationActive = registrationConfirmationState !== "idle"

  useAuthShellStaticState({ hasEntered, phase, visualMode })
  useRegistrationConfirmationAnimation({ state: registrationConfirmationState })

  return (
    <div className="relative min-h-dvh bg-capta-surface-default p-0 lg:grid lg:place-items-center lg:px-6 lg:py-12">
        <AuthBackLink
          className={cn(
            "top-6 left-6",
            isCenteredStage && "top-8 left-6 lg:top-[5.5rem] lg:left-[max(3.5rem,calc(50%-38rem))]",
            isRegistrationConfirmationActive && "pointer-events-none",
          )}
        />

        <div className="min-h-dvh w-full lg:h-[calc(100dvh-6rem)] lg:min-h-0 lg:max-w-7xl lg:rounded-[calc(var(--radius-token-xl)+var(--space-2))] lg:border lg:border-capta-border-default lg:bg-capta-surface-raised lg:p-2">
          <div
            className="relative min-h-dvh bg-capta-surface-card lg:h-full lg:min-h-0 lg:overflow-hidden lg:rounded-[var(--radius-token-xl)] lg:border lg:border-capta-border-default lg:shadow-[var(--shadow-stage)]"
            data-auth-stage
            data-auth-stage-variant={isSplitVisible ? "split" : "full"}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0",
                isCenteredStage ? "opacity-100" : "opacity-0",
              )}
            >
              <Image
                alt=""
                className="opacity-0 object-cover object-center"
                data-auth-stage-bg
                fill
                loading="eager"
                sizes="100vw"
                src="/images/auth/img_background_recovery_password.avif"
              />
            </div>

            <div
              className={cn(
                "absolute top-8 left-6 z-30 pointer-events-auto opacity-0",
                isRegistrationConfirmationActive && "pointer-events-none",
              )}
              data-auth-logo
            >
              <CaptaBrandLogo
                alt="CAPTAGOV"
                className="h-auto w-[154px]"
                height={36}
                variant="black"
                width={154}
              />
            </div>

            <div
              className={cn(
                "relative z-10 min-h-dvh lg:grid lg:h-full lg:min-h-0",
                isSplitVisible ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-1",
                isRegistrationConfirmationActive && "pointer-events-none",
              )}
              data-auth-flow
            >
              <aside
                aria-hidden={!isSplitVisible}
                className={cn(
                  "relative hidden overflow-hidden bg-capta-surface-card lg:block",
                  isSplitVisible ? "lg:relative lg:opacity-100" : "lg:absolute lg:inset-y-0 lg:left-0 lg:pointer-events-none lg:opacity-0",
                )}
                data-auth-panel
              >
                <Image
                  alt=""
                  className="opacity-0 object-cover object-center"
                  data-auth-panel-bg
                  fill
                  loading="eager"
                  sizes="50vw"
                  src="/images/auth/img_background_auth.avif"
                />
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-96 bg-gradient-to-t from-capta-surface-card to-transparent" />
                <AuthSourceIndicator />
                <div className="absolute top-[calc(50%-var(--space-8))] right-8 z-10 max-w-xs -translate-y-1/2">
                  <Card aria-hidden="true" className="auth-showcase-fade border-transparent border-r-0 p-6" data-auth-showcase variant="base">
                    <div className="space-y-2">
                      <p className="text-overline text-capta-text-secondary">{t("opportunity")}</p>
                      <p className="text-ui text-capta-text-secondary">{t("opportunityDescription")}</p>
                    </div>

                    <EditalScannerAnimation />

                    <p className="flex items-center gap-2 text-ui-semibold text-capta-brand-primary">
                      {t("viewOpportunity")}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </p>
                  </Card>
                </div>
                <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-20 w-32 bg-gradient-to-r from-transparent to-capta-surface-card" />
                <p className="absolute bottom-8 left-8 z-10 text-heading-3 text-capta-text-primary" data-auth-tagline>
                  <span className="block">{t("headlineLine1")}</span>
                  <span className="block">{t("headlineLine2")}</span>
                </p>
              </aside>

              <div
                className={cn(
                  "flex min-h-dvh flex-col lg:min-h-0",
                  isCenteredStageContentVisible ? "bg-transparent" : "bg-white",
                )}
                data-auth-content
              >
                <main
                  className={cn(
                    "flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12",
                    isCenteredStageContentVisible ? "items-center -translate-y-6 sm:-translate-y-8" : "items-center",
                  )}
                >
                  <div className={cn("w-full max-w-md", className)} data-auth-form>
                    {children}
                  </div>
                </main>

                {!isCenteredStage && (
                  <footer className="px-4 py-4 text-center sm:px-6 sm:py-6">
                    {footer}
                    <nav aria-label={t("legalLinks")} className="flex items-center justify-center gap-2 text-caption text-capta-text-secondary" data-login-step>
                      <Link
                        className="motion-interactive rounded-sm outline-none hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2"
                        href="/termos-de-uso"
                      >
                        {t("terms")}
                      </Link>
                      <span aria-hidden="true">/</span>
                      <Link
                        className="motion-interactive rounded-sm outline-none hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2"
                        href="/politica-de-privacidade"
                      >
                        {t("privacy")}
                      </Link>
                      <span aria-hidden="true">/</span>
                      <span aria-label={t("version", { version: appVersion })}>v{appVersion}</span>
                    </nav>
                  </footer>
                )}
              </div>
            </div>

            {isRegistrationConfirmationActive && <RegistrationCreationLoader />}
          </div>
        </div>
    </div>
  )
}

export { AuthPageShell }
export type { AuthPageShellProps }
