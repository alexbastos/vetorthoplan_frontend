import Image from "next/image"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { LandingLocaleSwitcher } from "../landing-locale-switcher"
import styles from "./resource-header.module.css"

// Mounted once by ResourcePageLayout for every public resource route.
async function ResourceHeader() {
  const [header, hero] = await Promise.all([
    getTranslations("orthovetLanding.header"),
    getTranslations("orthovetLanding.heroRebrand"),
  ])

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link aria-label={header("homeLabel")} className={styles.brand} href="/">
          <Image alt="" height={24} src="/brand/logo_vet_v2_black_spaced.svg" width={120} />
        </Link>
        <div className={styles.actions}>
          <LandingLocaleSwitcher variant="label" />
          <Link className={styles.createAccount} href="/register">{hero("register")}</Link>
        </div>
      </header>
    </div>
  )
}

export { ResourceHeader }
