import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import { CaptaBrandLogo } from "@/components/ui/capta-brand-logo"
import { LandingLocaleSwitcher } from "@/features/landing/components/landing-locale-switcher"

import styles from "./legal-page.module.css"

async function LegalHeader() {
  const t = await getTranslations("legal.header")

  return (
    <header className={styles.header} data-legal-header>
      <a
        className="sr-only z-50 rounded-sm bg-card px-4 py-3 text-body text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        href="#legal-document"
      >
        {t("skipToContent")}
      </a>
      <nav aria-label={t("navigationLabel")} className={`${styles.frame} flex h-20 items-center justify-between gap-1 px-4 sm:h-24 sm:gap-3 sm:px-8`}>
        <Link
          aria-label={t("homeLinkLabel")}
          className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-color)] focus-visible:ring-offset-2"
          href="/"
        >
          <CaptaBrandLogo alt="" className="h-auto w-16 sm:w-24 dark:invert" height={24} variant="black" width={96} />
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LandingLocaleSwitcher />
          <Button asChild className="max-sm:px-2" size="sm" variant="ghost">
            <Link href="/login">{t("login")}</Link>
          </Button>
          <Button asChild className="max-sm:px-2" size="sm" variant="secondary">
            <Link href="/register">{t("register")}</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}

export { LegalHeader }
