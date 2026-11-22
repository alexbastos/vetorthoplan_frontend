import Link from "next/link"
import { getTranslations } from "next-intl/server"
import type { CSSProperties } from "react"

import { LandingFadeIn } from "../animations/landing-fade-in"
import { capabilitiesAssurances } from "./capabilities-assurance-content"
import styles from "./capabilities-assurance-bar.module.css"

async function CapabilitiesAssuranceBar() {
  const t = await getTranslations("orthovetLanding.capabilities.assurance")

  return (
    <div className={styles.boundary}>
      <LandingFadeIn className={styles.inner}>
        <div className={styles.summary}>
          <div className={styles.iconTile} aria-hidden="true">
            <span className={styles.ring}>
              <span className={`${styles.half} ${styles.rightHalf}`} />
              <span className={`${styles.half} ${styles.leftHalf}`} />
            </span>
            <div className={styles.glyphs}>
              {capabilitiesAssurances.map(({ id, icon: Icon }, index) => (
                <Icon key={id} className={styles.glyph} style={{ "--i": index } as CSSProperties}
                  width={24} height={24} aria-hidden="true" focusable="false" />
              ))}
            </div>
          </div>
          <div className={styles.messages} aria-hidden="true">
            {capabilitiesAssurances.map(({ id }, index) => (
              <div key={id} className={styles.message} style={{ "--i": index } as CSSProperties}>
                <h3>{t(`items.${id}.title`)}</h3>
                <p className={styles.description}>{t(`items.${id}.description`)}</p>
              </div>
            ))}
          </div>
          {/* Stable reading order without announcing every automatic swap. */}
          <ul className="sr-only" aria-label={t("label")}>
            {capabilitiesAssurances.map(({ id }) => (
              <li key={id}>{t(`items.${id}.title`)}. {t(`items.${id}.description`)}</li>
            ))}
          </ul>
        </div>
        <Link className={styles.action} href="#platform">{t("action")}</Link>
      </LandingFadeIn>
    </div>
  )
}

export { CapabilitiesAssuranceBar }
