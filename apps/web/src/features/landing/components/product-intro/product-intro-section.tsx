import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import styles from "./product-intro-section.module.css"

async function ProductIntroSection() {
  const t = await getTranslations("orthovetLanding.intro")

  return (
    <section aria-labelledby="orthovet-intro-title" className={styles.section} id="workflow">
      <div className={styles.inner}>
        <h2 className={styles.label} id="orthovet-intro-title">
          <Link href="#platform">
            {t("label")}
            <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
          </Link>
        </h2>

        <div className={styles.copy}>
          <p>
            <strong>{t("firstLead")}</strong>{" "}
            <span>{t("firstBody")}</span>
          </p>
          <p>
            <strong>{t("secondLead")}</strong>{" "}
            <span>{t("secondBody")}</span>
          </p>
        </div>
      </div>
    </section>
  )
}

export { ProductIntroSection }
