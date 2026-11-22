import Image from "next/image"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { FooterEntrance } from "./footer-entrance"
import { FooterWordmark } from "./footer-wordmark"
import "./universal-footer.css"

const productLinks = [
  { key: "workflow", href: "/#workflow" },
  { key: "platform", href: "/#platform" },
  { key: "resources", href: "/#resources" },
  { key: "faq", href: "/#faq" },
] as const

const exploreLinks = [
  { key: "cases", href: "/resources/cases-and-patients" },
  { key: "community", href: "/resources/community" },
] as const

async function UniversalFooter({ variant = "default" }: { variant?: "default" | "resource" }) {
  const t = await getTranslations("orthovetLanding.footer")
  const hero = await getTranslations("orthovetLanding.heroRebrand")
  const year = new Date().getFullYear()

  return (
    <footer className={`universal-footer${variant === "resource" ? " universal-footer--resource" : ""}`}>
      <div className="universal-footer__shell">
        <FooterEntrance>
          <div className="universal-footer__main">
            <div className="universal-footer__brand" data-footer-brand>
              <Link aria-label={t("homeLinkLabel")} className="universal-footer__brand-link" href="/">
                <Image alt="" height={24} src="/brand/logo_vet_v2_black_spaced.svg" width={120} />
              </Link>
              <p>{t("brandDescription")}</p>
            </div>

            <nav aria-label={t("navigationLabel")} className="universal-footer__group" data-footer-column>
              <h2>{t("groups.product")}</h2>
              {productLinks.map(({ key, href }) => <Link href={href} key={key}>{t(`links.${key}`)}</Link>)}
            </nav>

            <nav aria-label={t("exploreNavigationLabel")} className="universal-footer__group" data-footer-column>
              <h2>{t("groups.explore")}</h2>
              {exploreLinks.map(({ key, href }) => <Link href={href} key={key}>{t(`links.${key}`)}</Link>)}
            </nav>

            <nav aria-label={t("legalNavigationLabel")} className="universal-footer__group" data-footer-column>
              <h2>{t("groups.legal")}</h2>
              <Link href="/politica-de-privacidade">{t("links.privacy")}</Link>
              <Link href="/termos-de-uso">{t("links.terms")}</Link>
            </nav>
          </div>

          <div className="universal-footer__legal" data-footer-bottom>
            <p>{t("copyright", { year })}</p>
            <nav aria-label={t("accountNavigationLabel")}>
              <Link href="/login">{t("links.login")}</Link>
              <Link className="universal-footer__signup" href="/register">{hero("register")} <span aria-hidden="true">→</span></Link>
            </nav>
          </div>
        </FooterEntrance>

        <FooterWordmark />
      </div>
    </footer>
  )
}

export { UniversalFooter }
