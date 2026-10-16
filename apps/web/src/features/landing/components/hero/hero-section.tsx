import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"

import { LandingSectionFrame } from "../landing-section-frame"
import { HeroGridBackground } from "./hero-grid-background"
import { HeroVisual } from "./hero-visual"

async function HeroSection() {
  const t = await getTranslations("landing.hero")

  return (
    <section
      data-landing-hero
      aria-labelledby="landing-hero-title"
      className="relative isolate flex min-h-svh w-full items-center px-4 pb-12 pt-24 sm:px-6 sm:pt-28 lg:px-0 lg:pb-16 lg:pt-14"
    >
      <HeroGridBackground />
      <LandingSectionFrame />

      <div className="relative z-10 grid w-full grid-cols-1 items-center gap-12 lg:-translate-y-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
        <div className="w-full max-w-[30rem] justify-self-start lg:pl-4">
          <p className="inline-flex items-center rounded-full border border-[var(--color-brand-primary)] bg-[var(--color-surface-card)] px-3 py-1.5 text-overline text-capta-text-primary shadow-[-1px_0_0_var(--color-brand-primary),-2px_1px_0_var(--color-brand-primary),-3px_1px_0_var(--color-brand-primary),-4px_2px_0_var(--color-brand-primary),-8px_7px_18px_-14px_rgb(11_31_58_/_50%),inset_0_1px_0_rgb(255_255_255_/_90%)] lg:translate-x-1">
            {t("eyebrow")}
          </p>
          <h1
            id="landing-hero-title"
            className="mt-6 font-heading text-[clamp(2.5rem,6vw,var(--type-heading-1-size))] leading-none font-medium tracking-[-0.02em] text-capta-text-primary"
          >
            <span className="block">{t("titleLine1")}</span>
            <span className="block">{t("titleLine2")}</span>
          </h1>
          <p className="mt-8 max-w-[27rem] text-pretty text-body text-capta-text-secondary">{t("description")}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="md" variant="primary">
              <Link href="/register">{t("actions.primary")}</Link>
            </Button>
            <Button asChild size="md" variant="secondary">
              <Link href="#produto-visao-geral">{t("actions.secondary")}</Link>
            </Button>
          </div>
        </div>

        <HeroVisual
          aria-hidden="true"
          aria-labelledby={undefined}
          className="w-full max-w-[36.75rem] justify-self-center lg:justify-self-end"
          focusable="false"
          role={undefined}
        />
      </div>
    </section>
  )
}

export { HeroSection }
