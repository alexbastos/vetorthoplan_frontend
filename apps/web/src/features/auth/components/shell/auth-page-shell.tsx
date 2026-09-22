"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { useRegistrationConfirmationAnimation } from "../../hooks/animations/use-registration-confirmation-animation"
import { AuthBackLink } from "../navigation/auth-back-link"
import { RegistrationCreationLoader } from "../status/registration-creation-loader"
import { AuthPageMotion } from "./auth-page-motion"
import { AuthTransitionProvider, useAuthTransition } from "./auth-transition-provider"

type AuthPageShellProps = {
  children: ReactNode
  className?: string
  footer?: ReactNode
}

function AuthPageShell({ children, className, footer }: AuthPageShellProps) {
  return (
    <AuthTransitionProvider>
      <AuthPageMotion>
        <AuthPageShellStage className={className} footer={footer}>
          {children}
        </AuthPageShellStage>
      </AuthPageMotion>
    </AuthTransitionProvider>
  )
}

function AuthPageShellStage({ children, className, footer }: AuthPageShellProps) {
  const t = useTranslations("auth.shell")
  const { registrationConfirmationState } = useAuthTransition()
  const isRegistrationConfirmationActive = registrationConfirmationState !== "idle"

  useRegistrationConfirmationAnimation({ state: registrationConfirmationState })

  return (
    <div className="auth-surface relative min-h-dvh overflow-hidden bg-background">
      <Image
        alt=""
        className="object-cover object-center"
        data-auth-stage-bg
        fill
        priority
        sizes="100vw"
        src="/images/auth/img_background_auth.avif"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-white/58"
      />

      <div
        className="relative grid min-h-dvh grid-rows-[auto_1fr_auto] text-foreground"
        data-auth-stage
        data-auth-stage-variant="full"
      >
        <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
          <Link
            aria-label={t("brandHome")}
            className="motion-interactive relative block h-12 w-52 rounded-sm outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-white sm:h-14 sm:w-56"
            data-auth-logo
            href="/"
          >
            <Image
              alt="Orthovet"
              className="object-contain object-left"
              fill
              sizes="(min-width: 640px) 14rem, 13rem"
              src="/brand/logo_vet_ofc.avif"
            />
          </Link>
        </header>

        <AuthBackLink
          className={cn(
            "top-[calc(50%-13rem)] left-[max(1.25rem,calc(50%-13.5rem))]",
            isRegistrationConfirmationActive && "pointer-events-none",
          )}
        />

        <div
          className={cn(
            "relative z-10 flex min-h-0 flex-col",
            isRegistrationConfirmationActive && "pointer-events-none",
          )}
          data-auth-flow
        >
          <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-10">
            <div className={cn("w-full max-w-[27rem]", className)} data-auth-form>
              {children}
            </div>
          </main>
        </div>

        <footer className="relative z-20 px-5 py-6 text-center sm:px-8 lg:py-8" data-auth-footer>
          {footer}
          <nav
            aria-label={t("legalLinks")}
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-caption text-content-secondary"
          >
            <Link
              className="motion-interactive rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="/"
            >
              {t("home")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              className="motion-interactive rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="/politica-de-privacidade"
            >
              {t("privacy")}
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              className="motion-interactive rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href="/termos-de-uso"
            >
              {t("terms")}
            </Link>
          </nav>
        </footer>

        {isRegistrationConfirmationActive ? <RegistrationCreationLoader /> : null}
      </div>
    </div>
  )
}

export { AuthPageShell }
export type { AuthPageShellProps }
