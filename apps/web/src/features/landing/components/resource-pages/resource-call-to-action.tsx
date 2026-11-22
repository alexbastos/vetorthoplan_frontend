import Image from "next/image"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { LandingLightField } from "../landing-light-field"
import styles from "./resource-call-to-action.module.css"

async function ResourceCallToAction() {
  const t = await getTranslations("resourcePages.cta")

  return (
    <section aria-labelledby="resource-cta-title" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          <LandingLightField idPrefix="resource-cta" scrollParallax />

          <div className={styles.brand}>
            <Image alt={t("logoAlt")} className={styles.logo} height={28} src="/brand/logo_vet_v2_white_spaced.svg" width={140} />
          </div>

          <div className={styles.actionRow}>
            <h2 id="resource-cta-title">
              <span>{t("titleLine1")}</span>
              <span>{t("titleLine2")}</span>
            </h2>
            <Link className={styles.button} href="/register">{t("button")}</Link>
          </div>
        </div>
        <p className={styles.caption}>{t("caption")}</p>
      </div>
    </section>
  )
}

export { ResourceCallToAction }
