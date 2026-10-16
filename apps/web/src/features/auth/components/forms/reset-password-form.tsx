"use client"

import { useRef } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { PasswordInputField } from "@/components/ui/password-input-field"

import { AuthNavLink } from "../navigation/auth-nav-link"
import { useResetPasswordFormEntrance } from "../../hooks/animations/use-reset-password-form-entrance"
import { useResetPassword } from "../../hooks/use-reset-password"

type ResetPasswordFormProps = {
  token?: string
}

function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations("auth")
  const { form, isSubmitting, onSubmit } = useResetPassword(token)
  const formRef = useRef<HTMLElement>(null)

  useResetPasswordFormEntrance(formRef)

  return (
    <section ref={formRef} className="mx-auto w-full max-w-sm space-y-4">
      <header className="space-y-2" data-reset-password-step>
        <h1 className="text-heading-4 text-capta-text-primary">{t("resetPassword.title")}</h1>
        <p className="text-ui text-capta-text-secondary">
          {t("resetPassword.description")}
        </p>
      </header>

      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        <div data-reset-password-step>
          <PasswordInputField
            {...form.register("password")}
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            label={t("fields.newPassword")}
            placeholder={t("fields.newPasswordPlaceholder")}
            required
          />
        </div>
        <div data-reset-password-step>
          <PasswordInputField
            {...form.register("confirmPassword")}
            autoComplete="new-password"
            error={form.formState.errors.confirmPassword?.message}
            label={t("fields.confirmPassword")}
            placeholder={t("fields.confirmPasswordPlaceholder")}
            required
          />
        </div>
        <div data-reset-password-step>
          <Button className="w-full" loading={isSubmitting} type="submit">
            {t("resetPassword.submit")}
          </Button>
        </div>
      </form>

      <p className="text-center text-ui text-capta-text-secondary" data-reset-password-step>
        {t("shared.rememberedPassword")}{" "}
        <AuthNavLink className="font-semibold text-capta-text-primary" href="/login">
          {t("shared.signIn")}
        </AuthNavLink>
      </p>
    </section>
  )
}

export { ResetPasswordForm }
export type { ResetPasswordFormProps }
