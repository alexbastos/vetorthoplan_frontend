import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"

import { ClosingCtaVisual } from "./closing-cta-visual"
import styles from "./closing-cta.module.css"

async function ClosingCtaSection() {
  const t = await getTranslations("landing.closingCta")

  return (
    <section
      aria-labelledby="landing-closing-cta-title"
      aria-describedby="landing-closing-cta-description"
      className={`${styles.section} relative left-1/2 isolate w-screen -translate-x-1/2`}
      data-landing-closing-cta
    >
      <div className="relative z-10 mx-auto grid w-full max-w-[var(--layout-landing-max-width)] items-center px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[22rem] lg:grid-cols-2 lg:gap-12 lg:px-16">
        <div className="min-w-0 max-w-[28rem] text-left">
          <h2
            id="landing-closing-cta-title"
            className="font-heading text-heading-3 font-medium tracking-[-0.02em] text-balance"
          >
            {t("title")}
          </h2>
          <p
            id="landing-closing-cta-description"
            className="mt-4 max-w-[26rem] text-body text-pretty text-[var(--closing-cta-muted)]"
          >
            {t("description")}
          </p>
          <div className="mt-8 flex w-full max-w-[24rem] flex-col items-start gap-3 sm:flex-row" data-landing-closing-cta-actions>
            <Button asChild className="min-h-11 w-full sm:w-auto" size="md" variant="primary">
              <Link href="/register">{t("actions.register")}</Link>
            </Button>
            <Button asChild className="min-h-11 w-full sm:w-auto" size="md" variant="secondary">
              <Link href="/login">{t("actions.login")}</Link>
            </Button>
          </div>
        </div>
      </div>
      <ClosingCtaVisual />
    </section>
  )
}

export { ClosingCtaSection }
