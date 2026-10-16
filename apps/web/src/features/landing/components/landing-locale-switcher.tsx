"use client"

import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LocaleFlagIcon } from "@/components/ui/locale-flag-icon"
import { changeBrowserLocale } from "@/i18n/actions"
import { appLocales, defaultLocale, isAppLocale } from "@/i18n/config"

function LandingLocaleSwitcher() {
  const currentLocale = useLocale()
  const locale = isAppLocale(currentLocale) ? currentLocale : defaultLocale
  const t = useTranslations("landing.header.language")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hasError, setHasError] = useState(false)

  function selectLocale(value: string) {
    if (!isAppLocale(value) || value === locale || isPending) return

    setHasError(false)
    startTransition(async () => {
      try {
        await changeBrowserLocale(value)
        router.refresh()
      } catch {
        setHasError(true)
      }
    })
  }

  return (
    <div className="relative shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-busy={isPending}
            aria-label={t("triggerLabel", { language: t(`locales.${locale}`) })}
            className="motion-interactive flex size-8 cursor-pointer items-center justify-center rounded-full border border-capta-border-default outline-none transition-colors hover:bg-capta-text-primary/5 focus-visible:border-capta-brand-primary disabled:cursor-wait disabled:opacity-60"
            disabled={isPending}
            title={t("chooseLanguage")}
            type="button"
          >
            <LocaleFlagIcon className="size-5" locale={locale} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          aria-label={t("chooseLanguage")}
          className="min-w-52 motion-reduce:animate-none"
          sideOffset={8}
        >
          <DropdownMenuRadioGroup onValueChange={selectLocale} value={locale}>
            {appLocales.map((option) => (
              <DropdownMenuRadioItem className="min-h-11 gap-3 px-3 pr-8" disabled={isPending} key={option} value={option}>
                <LocaleFlagIcon className="size-5" locale={option} />
                <span lang={option}>{t(`locales.${option}`)}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {hasError ? (
        <p className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg bg-popover p-3 text-caption text-popover-foreground shadow-md" role="alert">
          {t("changeError")}
        </p>
      ) : null}
    </div>
  )
}

export { LandingLocaleSwitcher }
