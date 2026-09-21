"use client"

import { KeyRound, Mail, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import type { BaseSyntheticEvent } from "react"
import type { UseFormReturn } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { InputField } from "@/components/ui/input-field"

import type { MfaCodeValues } from "../../hooks/use-mfa-login-challenge"
import { formatMfaCode, isValidMfaCode } from "../../lib/mfa-challenge"
import type { MfaMethod } from "../../types/auth"

type MfaChallengeFormProps = {
  availableMethods: MfaMethod[]
  emailCooldownSeconds: number
  form: UseFormReturn<MfaCodeValues>
  isSendingEmailCode: boolean
  isVerifying: boolean
  method: MfaMethod
  onBack: () => void
  onMethodChange: (method: MfaMethod) => void
  onSendEmailCode: () => void
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>
}

const METHOD_ICONS = {
  EMAIL: Mail,
  RECOVERY: KeyRound,
  TOTP: ShieldCheck,
} as const

function MfaChallengeForm({
  availableMethods,
  emailCooldownSeconds,
  form,
  isSendingEmailCode,
  isVerifying,
  method,
  onBack,
  onMethodChange,
  onSendEmailCode,
  onSubmit,
}: MfaChallengeFormProps) {
  const t = useTranslations("auth.mfa")
  const titleRef = useRef<HTMLHeadingElement>(null)
  const codeRegistration = form.register("code", {
    required: t("errors.required"),
    validate: (value) => isValidMfaCode(value, method) || t(method === "RECOVERY" ? "errors.invalidRecoveryCode" : "errors.invalidOneTimeCode"),
  })

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-foreground">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </div>
        <h1 className="text-heading-4 text-foreground outline-none" ref={titleRef} tabIndex={-1}>
          {t("title")}
        </h1>
        <p className="text-ui text-content-secondary">{t("description")}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-caption font-semibold text-foreground">{t("methodLegend")}</legend>
        <div className="grid gap-2">
          {availableMethods.map((availableMethod) => {
            const Icon = METHOD_ICONS[availableMethod]
            const checked = availableMethod === method

            return (
              <label className="cursor-pointer" key={availableMethod}>
                <input
                  checked={checked}
                  className="peer sr-only"
                  name="mfa-method"
                  onChange={() => onMethodChange(availableMethod)}
                  type="radio"
                  value={availableMethod}
                />
                <span className="flex items-start gap-3 rounded-[var(--radius-token-md)] border border-border bg-card p-3 transition-colors peer-checked:border-ring peer-checked:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-content-secondary" />
                  <span>
                    <span className="block text-ui font-semibold text-foreground">{t(`methods.${availableMethod}.label`)}</span>
                    <span className="mt-0.5 block text-caption text-content-secondary">{t(`methods.${availableMethod}.description`)}</span>
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {method === "EMAIL" ? (
        <div className="rounded-[var(--radius-token-md)] border border-border bg-muted p-3">
          <p className="text-caption text-content-secondary">{t("emailHelp")}</p>
          <Button
            className="mt-3 w-full"
            disabled={emailCooldownSeconds > 0}
            loading={isSendingEmailCode}
            onClick={onSendEmailCode}
            size="sm"
            type="button"
            variant="secondary"
          >
            {emailCooldownSeconds > 0 ? t("resendCountdown", { seconds: emailCooldownSeconds }) : t("sendEmailCode")}
          </Button>
        </div>
      ) : null}

      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        <InputField
          {...codeRegistration}
          autoCapitalize={method === "RECOVERY" ? "characters" : "off"}
          autoComplete="one-time-code"
          autoCorrect="off"
          error={form.formState.errors.code?.message}
          helperText={t(method === "RECOVERY" ? "recoveryCodeHelp" : "oneTimeCodeHelp")}
          inputMode={method === "RECOVERY" ? "text" : "numeric"}
          label={t(method === "RECOVERY" ? "recoveryCodeLabel" : "codeLabel")}
          maxLength={method === "RECOVERY" ? 17 : 6}
          onChange={(event) => {
            event.target.value = formatMfaCode(event.target.value, method)
            void codeRegistration.onChange(event)
          }}
          placeholder={method === "RECOVERY" ? "XXXXXXXX-XXXXXXXX" : "000000"}
          required
        />

        <Button className="w-full" loading={isVerifying} type="submit">
          {t("verify")}
        </Button>
        <Button className="w-full" disabled={isVerifying} onClick={onBack} type="button" variant="ghost">
          {t("back")}
        </Button>
      </form>
    </div>
  )
}

export { MfaChallengeForm }
