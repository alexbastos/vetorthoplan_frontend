"use client"

import { useRef } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { InputField } from "@/components/ui/input-field"
import { PasswordInputField } from "@/components/ui/password-input-field"

import { AuthNavLink } from "../navigation/auth-nav-link"
import { GoogleAuthButton } from "./google-auth-button"
import {
  MfaLoginChallengeProvider,
  MfaLoginChallengeView,
  useMfaLoginChallengeContext,
} from "./mfa-login-challenge-provider"
import { useLoginFormEntrance } from "../../hooks/animations/use-login-form-entrance"
import { useLoginEmailVerificationNotice } from "../../hooks/use-login-email-verification-notice"
import { useLogin } from "../../hooks/use-login"

type LoginFormProps = {
  redirectTo?: string
}

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
  const formRef = useRef<HTMLDivElement>(null)

  useLoginFormEntrance(formRef)
  useLoginEmailVerificationNotice()

  if (isChallengeActive) {
    return <MfaLoginChallengeView />
  }

  return (
    <div ref={formRef} className="space-y-4">
      <div className="space-y-2 text-center" data-login-step>
        <h1 className="text-heading-4 text-capta-text-primary">{t("login.title")}</h1>
        <p className="text-ui text-capta-text-secondary">{t("login.description")}</p>
      </div>

      <div data-login-step>
        <GoogleAuthButton />
      </div>

      <div aria-label={t("shared.emailDividerLabel")} className="flex items-center gap-3" data-login-step role="separator">
        <div className="h-px flex-1 bg-capta-border-default" />
        <span className="text-ui text-capta-text-secondary">{t("shared.emailDivider")}</span>
        <div className="h-px flex-1 bg-capta-border-default" />
      </div>

      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        <div data-login-step>
          <InputField
            {...form.register("email")}
            autoComplete="email"
            error={form.formState.errors.email?.message}
            label={t("fields.email")}
            required
            type="email"
          />
        </div>

        <div data-login-step>
          <PasswordInputField
            {...form.register("password")}
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            label={t("fields.password")}
            required
          />
        </div>

        <p className="text-right text-ui text-capta-text-secondary" data-login-step>
          <AuthNavLink className="font-semibold text-capta-text-primary" href="/forgot-password">
            {t("login.forgotPassword")}
          </AuthNavLink>
        </p>

        <div data-login-step>
          <Button className="w-full" loading={isSubmitting} type="submit">
            {t("login.submit")}
          </Button>
        </div>
      </form>

      <p className="text-center text-ui text-capta-text-secondary" data-login-step>
        {t("login.noAccount")}{" "}
        <AuthNavLink
          className="font-semibold text-capta-text-primary"
          href="/register"
        >
          {t("shared.createAccount")}
        </AuthNavLink>
      </p>
    </div>
  )
}

export { LoginForm }
export type { LoginFormProps }
