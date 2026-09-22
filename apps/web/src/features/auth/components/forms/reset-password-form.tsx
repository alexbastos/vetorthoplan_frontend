"use client"

import { useRef, type FormEvent } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { PasswordInputField } from "@/components/ui/password-input-field"

import { AuthNavLink } from "../navigation/auth-nav-link"
import { useResetPasswordFormEntrance } from "../../hooks/animations/use-reset-password-form-entrance"
import { useResetPassword } from "../../hooks/use-reset-password"

type ResetPasswordFormProps = {
  token?: string
  preview?: boolean
}

function ResetPasswordForm({ token, preview = false }: ResetPasswordFormProps) {
  const t = useTranslations("auth")
  const { form, isSubmitting, onSubmit } = useResetPassword(token)
  const formRef = useRef<HTMLElement>(null)

  useResetPasswordFormEntrance(formRef)

  const handlePreviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  return (
    <section ref={formRef} className="mx-auto w-full max-w-[26rem] space-y-6">
      <header className="space-y-2 text-center" data-reset-password-step>
        <h1 className="text-heading-2 text-foreground">{t("resetPassword.title")}</h1>
        <p className="text-ui text-content-secondary">{t("resetPassword.description")}</p>
      </header>

      <form className="space-y-4" noValidate onSubmit={preview ? handlePreviewSubmit : onSubmit}>
        <div data-reset-password-step>
          <PasswordInputField
            {...form.register("password")}
            aria-label={t("fields.newPassword")}
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            label={t("fields.newPassword")}
            placeholder={t("fields.newPassword")}
            required
            showLabel={false}
            variant="pill"
          />
        </div>
        <div data-reset-password-step>
          <PasswordInputField
            {...form.register("confirmPassword")}
            aria-label={t("fields.confirmPassword")}
            autoComplete="new-password"
            error={form.formState.errors.confirmPassword?.message}
            label={t("fields.confirmPassword")}
            placeholder={t("fields.confirmPassword")}
            required
            showLabel={false}
            variant="pill"
          />
        </div>
        <div data-reset-password-step>
          <Button className="w-full" loading={preview ? false : isSubmitting} type="submit" variant="pill">
            {t("resetPassword.submit")}
          </Button>
        </div>
      </form>

      <p className="text-center text-ui text-content-secondary" data-reset-password-step>
        {t("shared.rememberedPassword")}{" "}
        <AuthNavLink className="font-medium text-foreground hover:underline" href="/login">
          {t("shared.signIn")}
        </AuthNavLink>
      </p>
    </section>
  )
}

export { ResetPasswordForm }
export type { ResetPasswordFormProps }
