import { getTranslations } from "next-intl/server"

import { LandingSectionDivider } from "../landing-section-divider"
import { ResourceReveal } from "../resource-pages/resource-reveal"
import { ResourceTitle } from "../resource-pages/resource-title"
import { ClinicalCaseStoryScroll } from "./clinical-case-story-scroll"
import styles from "./clinical-case-story.module.css"

const moments = ["context", "scale", "planning", "review"] as const

async function ClinicalCaseStory() {
  const t = await getTranslations("orthovetLanding.clinicalCaseStory")

  return (
    <section aria-labelledby="orthovet-case-story-title" className={styles.section}>
      <LandingSectionDivider />
      <div className={styles.inner}>
        <ResourceReveal as="header" className={styles.heading}>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <ResourceTitle as="h2" className={styles.title} id="orthovet-case-story-title">
            {t("title")}
          </ResourceTitle>
        </ResourceReveal>

        <ClinicalCaseStoryScroll
          moments={moments.map((moment, index) => ({
            label: t("stepLabel", { number: index + 1 }),
            title: t(`moments.${moment}.title`),
            description: t(`moments.${moment}.description`),
          }))}
          labels={{
            case: t("visuals.case"),
            patientName: t("patientName"),
            secondPatientName: t("visuals.secondPatientName"),
            patientMeta: t("visuals.patientMeta"),
            secondPatientMeta: t("visuals.secondPatientMeta"),
            professionalName: t("visuals.professionalName"),
            responsible: t("visuals.responsible"),
            activeStatus: t("visuals.active"),
            draftStatus: t("visuals.draft"),
            completedStatus: t("visuals.completed"),
            casesTab: t("visuals.casesTab"),
            professionalsTab: t("visuals.professionalsTab"),
            search: t("visuals.search"),
            casePlanning: t("visuals.casePlanning"),
            lateral: t("visuals.lateral"),
            calibrate: t("visuals.calibrate"),
            scale: t("visuals.scale"),
            planning: t("visuals.planning"),
            axis: t("visuals.axis"),
            measure: t("visuals.measure"),
            simulation: t("visuals.simulation"),
            review: t("visuals.review"),
            report: t("visuals.report"),
            saved: t("visuals.saved"),
          }}
          scrollLabel={t("scrollLabel")}
        />
      </div>
    </section>
  )
}

export { ClinicalCaseStory }
