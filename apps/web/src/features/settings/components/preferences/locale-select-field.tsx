"use client"

import { useTranslations } from "next-intl"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { appLocales, isAppLocale, type AppLocale } from "@/i18n/config"
import { LocaleFlagIcon } from "./locale-flag-icon"

type LocaleSelectFieldProps = {
  error?: string
  locale: AppLocale
  onValueChange: (value: AppLocale) => void
}

function LocaleSelectField({ error, locale, onValueChange }: LocaleSelectFieldProps) {
  const t = useTranslations("settings.preferences")
  const inputId = "profile-locale"
  const errorId = `${inputId}-error`

  return (
    <div>
      <div className="flex min-w-0 items-center gap-3">
        <LocaleFlagIcon locale={locale} />
        <div className="min-w-0">
          <label className="text-caption font-semibold text-capta-text-primary" htmlFor={inputId}>{t("language")}</label>
          <p className="mt-1 text-caption text-capta-text-secondary">{t("languageHint")}</p>
        </div>
      </div>
      <div className="mt-3">
        <Select
          onValueChange={(value) => {
            if (isAppLocale(value)) onValueChange(value)
          }}
          value={locale}
        >
          <SelectTrigger aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} className="h-9 text-caption" id={inputId}><SelectValue /></SelectTrigger>
          <SelectContent align="start">
            {appLocales.map((option) => <SelectItem key={option} value={option}>{t(`locales.${option}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="mt-2 text-caption text-[var(--color-feedback-error)]" id={errorId} role="alert">{error}</p> : null}
    </div>
  )
}

export { LocaleSelectField }
