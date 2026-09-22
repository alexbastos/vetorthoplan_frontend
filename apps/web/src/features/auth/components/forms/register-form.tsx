"use client"

import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRef } from "react"
import { useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { InputField } from "@/components/ui/input-field"
import { PasswordInputField } from "@/components/ui/password-input-field"
import { evaluatePasswordPolicy } from "@/lib/password-policy"

import { useRegisterFormEntrance } from "../../hooks/animations/use-register-form-entrance"
import { useRegister } from "../../hooks/use-register"
import { AuthNavLink } from "../navigation/auth-nav-link"
import { GoogleAuthButton } from "./google-auth-button"
import {
  MfaLoginChallengeProvider,
  MfaLoginChallengeView,
  useMfaLoginChallengeContext,
} from "./mfa-login-challenge-provider"

function RegisterForm() {
  return (
    <MfaLoginChallengeProvider>
      <RegisterFormContent />
    </MfaLoginChallengeProvider>
  )
}

function RegisterFormContent() {
  const t = useTranslations("auth")
  const tValidation = useTranslations("validation")
  const { form, isSubmitting, onSubmit } = useRegister()
  const { isChallengeActive } = useMfaLoginChallengeContext()
  const formRef = useRef<HTMLDivElement>(null)
  const password = useWatch({ control: form.control, name: "password" })
  const hasCompletedPasswordEntry = form.formState.touchedFields.password && password.length > 0
  const passwordPolicy = evaluatePasswordPolicy(password)
  const missingPasswordRequirements = [
    !passwordPolicy.hasMinimumLength ? t("register.passwordRequirementLength") : null,
    !passwordPolicy.hasUppercase ? t("register.passwordRequirementUppercase") : null,
    !passwordPolicy.hasLowercase ? t("register.passwordRequirementLowercase") : null,
    !passwordPolicy.hasNumber ? t("register.passwordRequirementNumber") : null,
    !passwordPolicy.hasSpecialCharacter ? t("register.passwordRequirementSymbol") : null,
    !passwordPolicy.hasNoWhitespace ? t("register.passwordRequirementNoSpaces") : null,
    !passwordPolicy.hasValidUtf8ByteLength ? tValidation("passwordMax") : null,
  ].filter((requirement): requirement is string => requirement !== null)
  const passwordHelperText = hasCompletedPasswordEntry && missingPasswordRequirements.length > 0
    ? `${t("register.passwordRequirementsPrefix")} ${missingPasswordRequirements.join(" · ")}`
    : undefined

  useRegisterFormEntrance(formRef)

  if (isChallengeActive) {
    return <MfaLoginChallengeView />
  }

  return (
    <div ref={formRef} className="mx-auto w-full max-w-[26rem] space-y-6">
      <div data-register-step>
        <AuthNavLink
          className="inline-flex items-center gap-2 px-2 py-1 text-ui text-content-secondary hover:text-foreground"
          href="/login"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("shell.back")}
        </AuthNavLink>
      </div>

      <header className="space-y-2 text-center" data-register-step>
        <h1 className="text-heading-2 text-foreground">{t("register.title")}</h1>
        <p className="text-ui text-content-secondary">{t("register.description")}</p>
      </header>

      <div data-register-step>
        <GoogleAuthButton size="md" />
      </div>

      <div aria-label={t("shared.or")} className="flex items-center gap-3 text-ui text-content-secondary" data-register-step role="separator">
        <div aria-hidden="true" className="h-px flex-1 bg-border" />
        <span>{t("shared.or")}</span>
        <div aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>

      <form className="space-y-4" data-register-step noValidate onSubmit={onSubmit}>
        <InputField
          {...form.register("name")}
          aria-label={t("fields.fullName")}
          autoComplete="name"
          error={form.formState.errors.name?.message}
          label={t("fields.fullName")}
          placeholder={t("fields.fullName")}
          required
          showLabel={false}
          variant="pill"
        />

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
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          helperText={passwordHelperText}
          label={t("fields.password")}
          placeholder={t("fields.password")}
          required
          showLabel={false}
          variant="pill"
        />

        <Button className="w-full" loading={isSubmitting} type="submit" variant="pill">
          {t("register.submit")}
        </Button>
      </form>

      <p className="text-center text-ui text-content-secondary" data-register-step>
        {t("shared.alreadyRegistered")} {" "}
        <AuthNavLink className="font-medium text-foreground hover:underline" href="/login">
          {t("shared.signIn")}
        </AuthNavLink>
      </p>
    </div>
  )
}

export { RegisterForm }
