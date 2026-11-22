import { getTranslations } from "next-intl/server"

import { LandingSectionDivider } from "../landing-section-divider"
import { RoutineBenefitCard } from "./routine-benefit-card"
import { routineBenefits } from "./routine-benefits-content"
import { RoutineBenefitsEntrance } from "./routine-benefits-entrance"
import styles from "./routine-benefits-section.module.css"

async function RoutineBenefitsSection() {
  const t = await getTranslations("orthovetLanding.routineBenefits")

  return (
    <section className={styles.section} id="routine" aria-labelledby="orthovet-routine-title">
      <LandingSectionDivider />
      <RoutineBenefitsEntrance className={styles.inner}>
        <header className={styles.heading} data-routine-reveal>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h2 className={styles.title} id="orthovet-routine-title">
            <span>{t("titleLine1")}</span>
            <span>{t("titleLine2")}</span>
          </h2>
        </header>
        <ul className={styles.cards} role="list">
          {routineBenefits.map(({ id, icon }) => (
            <RoutineBenefitCard key={id} icon={icon}
              firstLine={t(`items.${id}.firstLine`)} secondLine={t(`items.${id}.secondLine`)} />
          ))}
        </ul>
      </RoutineBenefitsEntrance>
    </section>
  )
}

export { RoutineBenefitsSection }
