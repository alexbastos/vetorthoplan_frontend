import { FileImage, FileText, Layers3, Ruler } from "lucide-react"
import { useTranslations } from "next-intl"

import styles from "./home-page.module.css"

const steps = [
  { key: "image", icon: FileImage },
  { key: "measure", icon: Ruler },
  { key: "plan", icon: Layers3 },
  { key: "report", icon: FileText },
] as const

function HomeProductJourney() {
  const t = useTranslations("home.journey")

  return (
    <section aria-labelledby="home-journey-title" className={styles.journey} data-home-journey>
      <div className={styles.journeyHeading}>
        <div>
          <p className={styles.journeyEyebrow}>{t("eyebrow")}</p>
          <h2 className={styles.journeyTitle} id="home-journey-title">{t("title")}</h2>
        </div>
        <p className={styles.journeyDescription}>{t("description")}</p>
      </div>
      <ol className={styles.journeySteps}>
        {steps.map(({ key, icon: Icon }, index) => (
          <li className={styles.journeyStep} key={key}>
            <span className={styles.journeyStepIcon}><Icon aria-hidden="true" className="size-5" strokeWidth={1.6} /></span>
            <span className={styles.journeyStepNumber}>0{index + 1}</span>
            <span className={styles.journeyStepLabel}>{t(key)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export { HomeProductJourney }
