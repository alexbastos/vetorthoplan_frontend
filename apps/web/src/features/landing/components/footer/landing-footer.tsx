import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { CaptaBrandLogo } from "@/components/ui/capta-brand-logo"

import { footerNavigationGroups, type FooterContent } from "./footer-content"

async function LandingFooter() {
  const t = await getTranslations("landing.footer")
  const year = new Date().getFullYear()
  const content: FooterContent = {
    brandDescription: t("brandDescription"),
    navigationLabel: t("navigationLabel"),
    homeLinkLabel: t("homeLinkLabel"),
    groupLabels: Object.fromEntries(
      footerNavigationGroups.map(({ id }) => [id, t(`groups.${id}`)]),
    ) as FooterContent["groupLabels"],
    linkLabels: Object.fromEntries(
      footerNavigationGroups.flatMap(({ links }) =>
        links.map(({ id }) => [id, t(`links.${id}`)]),
      ),
    ) as FooterContent["linkLabels"],
    footerStatus: t("footerStatus"),
    footerCenter: t("footerCenter"),
    copyright: t("copyright", { year }),
  }

  return (
    <footer className="relative isolate w-full bg-card" data-landing-footer>
      <div className="relative mx-auto w-full max-w-[var(--layout-landing-max-width)] px-4 py-12 sm:px-6 lg:px-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(34rem,1.05fr)]">
          <div className="max-w-[22rem]" data-landing-footer-brand>
            <Link
              href="/"
              aria-label={content.homeLinkLabel}
              className="inline-flex -ml-2.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-color)] focus-visible:ring-offset-2"
            >
              <CaptaBrandLogo alt="" className="h-auto w-24" variant="black" width={96} height={24} priority={false} />
            </Link>
            <p className="mt-4 text-body text-pretty text-content-secondary">
              {content.brandDescription}
            </p>
          </div>

          <nav aria-label={content.navigationLabel} className="grid gap-8 sm:grid-cols-3">
            {footerNavigationGroups.map(({ id, links }) => (
              <div key={id} data-landing-footer-group={id}>
                <h2 className="text-[14px] leading-5 font-semibold text-foreground">
                  {content.groupLabels[id]}
                </h2>
                <ul className="mt-2 space-y-2" role="list">
                  {links.map(({ id: linkId, href }) => (
                    <li key={linkId}>
                      <Link
                        href={href}
                        className="inline-flex min-h-5 items-center rounded-sm text-[14px] leading-5 text-content-secondary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--button-focus-color)] focus-visible:ring-offset-2"
                      >
                        {content.linkLabels[linkId]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 grid gap-3 text-caption text-content-secondary sm:grid-cols-3 sm:items-center" data-landing-footer-copyright>
          <p className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
            {content.footerStatus}
          </p>
          <p className="sm:text-center">{content.footerCenter}</p>
          <p className="sm:text-right">{content.copyright}</p>
        </div>
      </div>
    </footer>
  )
}

export { LandingFooter }
