import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { HeroBackground } from "./hero-background"
import { HeroHeader } from "./hero-header"
import { HeroEntrance } from "./hero-entrance"
import { HeroProductFrame } from "./hero-product-frame"
import { HeroProductSidebar } from "./hero-product-sidebar"
import { HeroProductWorkspace } from "./hero-product-workspace"
import { HeroWordCycler } from "./hero-word-cycler"
import { HeroTitleCharacters } from "./hero-title-characters"
import styles from "./hero-section.module.css"

const wordKeys = ["surgeries", "corrections", "implants"] as const

async function HeroSection({ intro }: { intro?: ReactNode }) {
  const t = await getTranslations("orthovetLanding.heroRebrand")
  const words = wordKeys.map((key) => ({ key, label: t(`words.${key}`) }))

  return (
    <HeroEntrance className={styles.hero} intro={intro}>
      <div className={styles.shell}>
        <HeroHeader />

        <div className={styles.row}>
          <div className={styles.copy}>
            <h1 className={styles.accessibleTitle} id="orthovet-hero-title">
              {t("accessibleTitle")}
            </h1>

            <div aria-hidden="true" className={styles.title} data-hero-entrance-title>
              <span className={styles.titleLine}>
                <HeroTitleCharacters>{t("titlePrefix")}</HeroTitleCharacters>{" "}<HeroWordCycler words={words} />
              </span>
              <span className={styles.titleLine}><HeroTitleCharacters>{t("titleLine2")}</HeroTitleCharacters></span>
              <span className={styles.titleLine}><HeroTitleCharacters>{t("titleLine3")}</HeroTitleCharacters></span>
            </div>

            <p className={styles.description} data-hero-entrance-description>{t("description")}</p>

            <Link className={styles.primaryAction} href="#platform" data-hero-entrance-action>
              <span>{t("primaryAction")}</span>
            </Link>
          </div>

          <div className={styles.visual}>
            <HeroBackground />
            <div className={styles.visualSizing} />
            <div className={styles.frameEntrance} data-hero-entrance-frame>
              <HeroProductFrame sidebar={<HeroProductSidebar />} workspace={<HeroProductWorkspace />} />
            </div>
          </div>
        </div>
      </div>
    </HeroEntrance>
  )
}

export { HeroSection }
