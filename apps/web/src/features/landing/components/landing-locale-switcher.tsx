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

import { LandingLocaleFlag } from "./landing-locale-flag"
import styles from "./landing-locale-switcher.module.css"

function LandingLocaleSwitcher({ variant = "icon" }: { variant?: "icon" | "label" }) {
  const currentLocale = useLocale()
  const locale = isAppLocale(currentLocale) ? currentLocale : defaultLocale
  const t = useTranslations("landing.header.language")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hasError, setHasError] = useState(false)
  const showLabel = variant === "label"
  const Flag = showLabel ? LandingLocaleFlag : LocaleFlagIcon

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
            className={showLabel ? styles.trigger : "motion-interactive flex size-8 cursor-pointer items-center justify-center rounded-full border border-border outline-none transition-colors hover:bg-foreground/5 focus-visible:border-ring disabled:cursor-wait disabled:opacity-60"}
            disabled={isPending}
            title={t("chooseLanguage")}
            type="button"
          >
            <Flag className="size-5" locale={locale} />
            {showLabel ? (
              <>
                <span className={styles.code}>{locale === "pt-BR" ? "PT-BR" : "EN"}</span>
                <svg aria-hidden="true" className={styles.chevron} fill="none" height="14" viewBox="0 0 48 48" width="14">
                  <path d="M36 18L24 30L12 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.3" />
                </svg>
              </>
            ) : null}
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
                <Flag className="size-5" locale={option} />
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
