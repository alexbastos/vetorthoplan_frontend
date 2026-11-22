import { getTranslations } from "next-intl/server"

import { resourcePagePaths } from "../../data/resource-routes"
import { LandingSectionDivider } from "../landing-section-divider"
import { CapabilitiesAccordion } from "./capabilities-accordion"
import { CapabilitiesAssuranceBar } from "./capabilities-assurance-bar"
import { CapabilitiesEntrance } from "./capabilities-entrance"
import { capabilityDefinitions, capabilityImages, type CapabilityKey } from "./capabilities-content"
import styles from "./capabilities-section.module.css"

const capabilityRoutes: Partial<Record<CapabilityKey, string>> = resourcePagePaths

async function CapabilitiesSection() {
  const t = await getTranslations("orthovetLanding.capabilities")
  const items = capabilityDefinitions.map(({ id, planned }) => ({
    id, title: t(`items.${id}.title`), description: t(`items.${id}.description`),
    caption: t(`items.${id}.caption`), actionLabel: t("cardAction"),
    comingSoon: planned ? t("comingSoon") : undefined,
    image: capabilityImages[id],
    href: capabilityRoutes[id],
  }))

  return (
    <section aria-labelledby="orthovet-capabilities-title" className={styles.section} id="resources">
      <LandingSectionDivider />

      <div className={styles.surface}>
        <CapabilitiesEntrance className={styles.inner}>
          <header className={styles.heading}>
            <div>
              <p className={styles.eyebrow}>{t("eyebrow")}</p>
              <h2 className={styles.title} id="orthovet-capabilities-title">
                <span>{t("titleLine1")}</span>
                <span>{t("titleLine2")}</span>
              </h2>
            </div>
            <p className={styles.description}>{t.rich("description", { strong: chunks => <strong>{chunks}</strong> })}</p>
          </header>
          <CapabilitiesAccordion items={items} label={t("accordionLabel")} />
        </CapabilitiesEntrance>
        <CapabilitiesAssuranceBar />
      </div>
    </section>
  )
}

export { CapabilitiesSection }
