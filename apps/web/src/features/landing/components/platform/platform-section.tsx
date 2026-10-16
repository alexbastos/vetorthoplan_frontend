import { getTranslations } from "next-intl/server"

import { PlatformCaseIllustration } from "./platform-case-illustration"
import { PlatformPrecisionIllustration } from "./platform-precision-illustration"
import { PlatformReviewIllustration } from "./platform-review-illustration"
import { PlatformTitle } from "./platform-title"
import styles from "./platform-section.module.css"

const pillars = ["case", "precision", "review"] as const

async function PlatformSection() {
  const t = await getTranslations("orthovetLanding.platform")

  return (
    <section aria-labelledby="orthovet-platform-title" className={styles.section} id="platform">
      <div className={styles.inner}>
        <PlatformTitle text={t("title")} />

        <div className={styles.grid}>
          {pillars.map((pillar) => (
            <article className={styles.pillar} key={pillar}>
              <div aria-hidden="true" className={styles.visualSlot}>
                {pillar === "case" ? <PlatformCaseIllustration /> : null}
                {pillar === "precision" ? <PlatformPrecisionIllustration /> : null}
                {pillar === "review" ? <PlatformReviewIllustration /> : null}
              </div>
              <div className={styles.copy}>
                <h3>{t(`${pillar}.title`)}</h3>
                <p>
                  <span className={styles.lead}>{t(`${pillar}.lead`)}</span>{" "}
                  {t(`${pillar}.description`)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export { PlatformSection }
