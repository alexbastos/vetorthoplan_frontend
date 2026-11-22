import Image from "next/image"
import { getLocale, getTranslations } from "next-intl/server"

import { HeroProductAnnotations } from "./hero-product-annotations"
import { heroRadiograph } from "./hero-product-measurements"
import { HeroProductTools } from "./hero-product-tools"
import { HeroProductSaveActions } from "./hero-product-save-feedback"
import styles from "./hero-product-workspace.module.css"

async function HeroProductViewer() {
  const [t, mockup, locale] = await Promise.all([
    getTranslations("cases.workspace.viewer"),
    getTranslations("orthovetLanding.marketingMockup"),
    getLocale(),
  ])
  const imageName = mockup("lateralFile")

  return (
    <div className={styles.viewer} data-hero-viewer>
      <div className={styles.canvas}>
        <div className={styles.radiograph} data-hero-radiograph>
          <Image
            alt={t("imageAlt", { name: imageName })}
            className={styles.image}
            fill
            priority
            sizes="(min-width: 1440px) 440px, (min-width: 992px) 30vw, 75vw"
            src={heroRadiograph.src}
          />
          <HeroProductAnnotations locale={locale} />
        </div>
        <HeroProductTools />
        <HeroProductSaveActions />
        <span className={styles.fileName}>{imageName}</span>
      </div>
    </div>
  )
}

export { HeroProductViewer }
