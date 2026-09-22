"use client"

import { useRef } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { InputField } from "@/components/ui/input-field"

import { AuthNavLink } from "../navigation/auth-nav-link"
import { useForgotPasswordFormEntrance } from "../../hooks/animations/use-forgot-password-form-entrance"
import { useForgotPassword } from "../../hooks/use-forgot-password"

function ForgotPasswordForm() {
  const t = useTranslations("auth")
  const { form, isSubmitting, onSubmit } = useForgotPassword()
  const formRef = useRef<HTMLElement>(null)

  useForgotPasswordFormEntrance(formRef)

  return (
    <section ref={formRef} className="mx-auto w-full max-w-[26rem] space-y-6">
      <header className="space-y-2 text-center" data-forgot-password-step>
        <h1 className="text-heading-2 text-foreground">{t("forgotPassword.title")}</h1>
        <p className="text-ui text-content-secondary">{t("forgotPassword.description")}</p>
      </header>

      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        <div data-forgot-password-step>
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
        </div>
        <div data-forgot-password-step>
          <Button className="w-full" loading={isSubmitting} type="submit" variant="pill">
            {t("forgotPassword.submit")}
          </Button>
        </div>
      </form>

      <p className="text-center text-ui text-content-secondary" data-forgot-password-step>
        {t("shared.rememberedPassword")}{" "}
        <AuthNavLink className="font-medium text-foreground hover:underline" href="/login">
          {t("shared.signIn")}
        </AuthNavLink>
      </p>
    </section>
  )
}

export { ForgotPasswordForm }
