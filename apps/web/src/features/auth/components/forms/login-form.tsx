"use client"

import { ArrowLeft, Mail } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { InputField } from "@/components/ui/input-field"
import { PasswordInputField } from "@/components/ui/password-input-field"

import { useLoginFormEntrance } from "../../hooks/animations/use-login-form-entrance"
import { useLoginEmailVerificationNotice } from "../../hooks/use-login-email-verification-notice"
import { useLogin } from "../../hooks/use-login"
import { AuthNavLink } from "../navigation/auth-nav-link"
import { GoogleAuthButton } from "./google-auth-button"
import {
  MfaLoginChallengeProvider,
  MfaLoginChallengeView,
  useMfaLoginChallengeContext,
} from "./mfa-login-challenge-provider"

type LoginFormProps = {
  redirectTo?: string
}

type LoginView = "options" | "email"

function LoginForm({ redirectTo }: LoginFormProps) {
  return (
    <MfaLoginChallengeProvider redirectTo={redirectTo}>
      <LoginFormContent />
    </MfaLoginChallengeProvider>
  )
}

function LoginFormContent() {
  const t = useTranslations("auth")
  const { form, isSubmitting, onSubmit } = useLogin()
  const { isChallengeActive } = useMfaLoginChallengeContext()
  const [view, setView] = useState<LoginView>("options")
  const formRef = useRef<HTMLDivElement>(null)
  const emailTitleRef = useRef<HTMLHeadingElement>(null)

  useLoginFormEntrance(formRef)
  useLoginEmailVerificationNotice()

  useEffect(() => {
    if (view === "email") {
      emailTitleRef.current?.focus()
    }
  }, [view])

  if (isChallengeActive) {
    return <MfaLoginChallengeView />
  }

  if (view === "email") {
    return (
      <div
        className="mx-auto w-full max-w-sm animate-in space-y-6 fade-in slide-in-from-bottom-2 duration-300"
        ref={formRef}
      >
        <button
          aria-label={t("shared.backToOptions")}
          className="motion-interactive inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-ui text-content-secondary outline-none hover:bg-white/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setView("options")}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("shell.back")}
        </button>

        <header className="space-y-2 text-center">
          <h1
            className="text-heading-2 text-foreground outline-none"
            ref={emailTitleRef}
            tabIndex={-1}
          >
            {t("login.emailTitle")}
          </h1>
          <p className="text-ui text-content-secondary">{t("login.emailDescription")}</p>
        </header>

        <form className="space-y-4" noValidate onSubmit={onSubmit}>
          <InputField
            {...form.register("email")}
            aria-label={t("fields.email")}
            autoComplete="email"
            error={form.formState.errors.email?.message}
            label={t("fields.email")}
            placeholder={t("fields.email")}
            required
            showLabel={false}
            type="email"
            variant="pill"
          />

          <PasswordInputField
            {...form.register("password")}
            aria-label={t("fields.password")}
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            label={t("fields.password")}
            placeholder={t("fields.password")}
            required
            showLabel={false}
            variant="pill"
          />

          <p className="text-right text-ui text-content-secondary">
            <AuthNavLink className="font-medium text-foreground hover:underline" href="/forgot-password">
              {t("login.forgotPassword")}
            </AuthNavLink>
          </p>

          <Button
            className="w-full"
            loading={isSubmitting}
            type="submit"
            variant="pill"
          >
            {t("login.submit")}
          </Button>
        </form>

        <p className="text-center text-ui text-content-secondary">
          {t("login.noAccount")} {" "}
          <AuthNavLink className="font-medium text-foreground hover:underline" href="/register">
            {t("shared.createAccount")}
          </AuthNavLink>
        </p>
      </div>
    )
  }

  return (
    <div
      className="mx-auto w-full max-w-[26rem] space-y-6"
      ref={formRef}
    >
      <header className="space-y-2 text-center" data-login-step>
        <h1 className="text-heading-2 text-foreground">{t("login.title")}</h1>
        <p className="text-ui text-content-secondary">{t("login.description")}</p>
      </header>

      <div data-login-step>
        <GoogleAuthButton />
      </div>

      <div aria-label={t("shared.or")} className="flex items-center gap-3 text-ui text-content-secondary" data-login-step role="separator">
        <div aria-hidden="true" className="h-px flex-1 bg-border" />
        <span>{t("shared.or")}</span>
        <div aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>

      <div data-login-step>
        <Button
          className="w-full"
          onClick={() => setView("email")}
          size="lg"
          type="button"
          variant="pillOption"
        >
          <Mail aria-hidden="true" className="size-5" />
          {t("shared.continueWithEmail")}
        </Button>
      </div>

      <p className="text-center text-ui text-content-secondary" data-login-step>
        {t("login.noAccount")} {" "}
        <AuthNavLink className="font-medium text-foreground hover:underline" href="/register">
          {t("shared.createAccount")}
        </AuthNavLink>
      </p>
    </div>
  )
}

export { LoginForm }
export type { LoginFormProps }
