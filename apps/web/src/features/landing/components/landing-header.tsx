import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import { CaptaBrandLogo } from "@/components/ui/capta-brand-logo"

import { landingNavigation } from "../data/landing-navigation"

async function LandingHeader() {
  const t = await getTranslations("landing.header")

  return (
    <header data-landing-header className="absolute inset-x-0 top-0 z-20 bg-transparent">
      <nav
        aria-label={t("mainNavigationLabel")}
        className="mx-auto flex h-14 w-full max-w-[var(--layout-landing-max-width)] items-center justify-between px-4 lg:grid lg:grid-cols-[17.25rem_minmax(0,1fr)_17.25rem] lg:px-0"
      >
        <Link
          href="/"
          aria-label={t("homeLinkLabel")}
          className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-color)] focus-visible:ring-offset-2 lg:translate-x-1.5"
        >
          <CaptaBrandLogo alt="" className="h-auto w-24" variant="black" width={96} height={24} />
        </Link>

        <ul className="hidden items-center justify-center lg:flex" role="list">
          {landingNavigation.map((item) => (
            <li key={item.href}>
              <Link
                className="motion-interactive inline-flex h-8 items-center gap-1 rounded-sm px-3 text-sm font-medium text-capta-text-primary/80 outline-none transition-colors hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-[var(--button-focus-color)] focus-visible:ring-offset-2"
                href={item.href}
              >
                {t(`navigation.${item.labelKey}`)}
                {item.hasDisclosure ? <ChevronDown aria-hidden="true" className="size-3" strokeWidth={1.8} /> : null}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/login">{t("actions.login")}</Link>
          </Button>
          <Button asChild size="sm" variant="primary">
            <Link href="/register">{t("actions.register")}</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}

export { LandingHeader }
