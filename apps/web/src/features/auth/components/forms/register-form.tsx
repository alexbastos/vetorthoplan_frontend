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
import { useRegisterFormEntrance } from "../../hooks/animations/use-register-form-entrance"
import { useRegister } from "../../hooks/use-register"

function RegisterForm() {
  return (
    <MfaLoginChallengeProvider>
      <RegisterFormContent />
    </MfaLoginChallengeProvider>
  )
}

function RegisterFormContent() {
  const t = useTranslations("auth")
  const { form, isSubmitting, onSubmit } = useRegister()
  const { isChallengeActive } = useMfaLoginChallengeContext()
  const formRef = useRef<HTMLDivElement>(null)

  useRegisterFormEntrance(formRef)

  if (isChallengeActive) {
    return <MfaLoginChallengeView />
  }

  return (
    <div ref={formRef} className="space-y-4">
      <div className="space-y-2 text-center" data-register-step>
        <h1 className="text-heading-4 text-capta-text-primary">{t("register.title")}</h1>
        <p className="text-ui text-capta-text-secondary">{t("register.description")}</p>
      </div>

      <div data-register-step>
        <GoogleAuthButton />
      </div>

      <div aria-label={t("shared.emailDividerLabel")} className="flex items-center gap-3" data-register-step role="separator">
        <div className="h-px flex-1 bg-capta-border-default" />
        <span className="text-ui text-capta-text-secondary">{t("shared.emailDivider")}</span>
        <div className="h-px flex-1 bg-capta-border-default" />
      </div>

      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        <div data-register-step>
          <InputField
            {...form.register("name")}
            autoComplete="name"
            error={form.formState.errors.name?.message}
            label={t("fields.fullName")}
            placeholder={t("fields.fullNamePlaceholder")}
            required
          />
        </div>

        <div data-register-step>
          <InputField
            {...form.register("email")}
            autoComplete="email"
            error={form.formState.errors.email?.message}
            label={t("fields.email")}
            placeholder={t("fields.emailPlaceholder")}
            required
            type="email"
          />
        </div>

        <div data-register-step>
          <PasswordInputField
            {...form.register("password")}
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            label={t("fields.password")}
            placeholder={t("fields.passwordPlaceholder")}
            required
          />
        </div>

        <div data-register-step>
          <Button className="w-full" loading={isSubmitting} type="submit">
            {t("register.submit")}
          </Button>
        </div>
      </form>

      <p className="text-center text-ui text-capta-text-secondary" data-register-step>
        {t("shared.alreadyRegistered")}{" "}
        <AuthNavLink
          className="font-semibold text-capta-text-primary"
          href="/login"
        >
          {t("shared.signIn")}
        </AuthNavLink>
      </p>
    </div>
  )
}

export { RegisterForm }
