import { Radar } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"

import { LandingSectionFrame } from "../landing-section-frame"

async function ProductIntelligenceIntroSection() {
  const t = await getTranslations("landing.productIntelligence.intro")

  return (
    <section
      id="produto-visao-geral"
      aria-labelledby="product-intelligence-intro-title"
      className="relative isolate w-full px-4 lg:px-16"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 z-0 h-px w-screen -translate-x-1/2 bg-[var(--landing-grid-border)]"
      />
      <LandingSectionFrame fade={false} />

      <div className="relative z-10 py-16 sm:py-20">
        <div className="max-w-[40rem]">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-5 items-center justify-center rounded-sm bg-capta-product-intelligence text-capta-text-inverse"
            >
              <Radar className="size-3" strokeWidth={2.25} />
            </span>
            <p className="text-meta font-medium text-capta-text-secondary">{t("eyebrow")}</p>
          </div>

          <h2
            id="product-intelligence-intro-title"
            className="mt-4 max-w-[36rem] font-heading text-[clamp(2rem,4vw,var(--type-heading-3-size))] leading-none font-medium tracking-[-0.02em] text-pretty text-capta-text-primary"
          >
            {t("title")}
          </h2>
          <p className="mt-4 max-w-[38rem] text-body text-pretty text-capta-text-secondary">
            {t("description")}
          </p>

          <Button asChild className="mt-7" size="sm" variant="secondary">
            <Link href="#produto">{t("action")}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export { ProductIntelligenceIntroSection }
