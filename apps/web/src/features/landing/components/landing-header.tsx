import Image from "next/image"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { LandingLocaleSwitcher } from "./landing-locale-switcher"
import styles from "./landing-header.module.css"

const navigationItems = ["platform", "workflow"] as const

async function LandingHeader({ homeSections = false }: { homeSections?: boolean }) {
  const [header, hero] = await Promise.all([
    getTranslations("orthovetLanding.header"),
    getTranslations("orthovetLanding.heroRebrand"),
  ])
  const sectionPrefix = homeSections ? "/" : ""

  return (
    <header className={styles.header}>
      <Link aria-label={header("homeLabel")} className={styles.brand} href="/" data-hero-header-item>
        <Image alt="" height={24} src="/brand/logo_vet_v2_black_spaced.svg" width={120} />
      </Link>
      <nav aria-label={header("navigationLabel")} className={styles.desktopNav} data-hero-header-item>
        {navigationItems.map(item => (
          <Link href={`${sectionPrefix}#${item}`} key={item}>{header(`navigation.${item}`)}</Link>
        ))}
      </nav>
      <div className={styles.headerActions} data-hero-header-item>
        <LandingLocaleSwitcher variant="label" />
        <Link className={styles.login} href="/login">{header("login")}</Link>
        <Link className={styles.register} href="/register">{hero("register")}</Link>
        <details className={styles.mobileMenu}>
          <summary aria-label={header("navigationLabel")}>
            <span /><span /><span />
          </summary>
          <nav aria-label={header("navigationLabel")}>
            {navigationItems.map(item => (
              <Link href={`${sectionPrefix}#${item}`} key={item}>{header(`navigation.${item}`)}</Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  )
}

export { LandingHeader }
