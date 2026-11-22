import Image from "next/image"
import { ArrowRight, Check, CircleCheck, Crosshair, ImageIcon, NotebookPen } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { HeroProductAnnotations } from "./hero-product-annotations"
import { heroRadiograph } from "./hero-product-measurements"
import { heroTpaConstruction } from "./hero-product-tpa"
import { HeroDemoButton, HeroDemoScene } from "./hero-product-demo-elements"
import styles from "./hero-product-report.module.css"

async function HeroProductReport() {
  const [t, workspace, mockup, landmarks, workflow, locale] = await Promise.all([
    getTranslations("orthovetLanding.heroRebrand.report"),
    getTranslations("orthovetLanding.heroRebrand.workspace"),
    getTranslations("orthovetLanding.marketingMockup"),
    getTranslations("cases.workspace.landmarks"),
    getTranslations("orthovetLanding.workflow.ui"),
    getLocale(),
  ])
  const angle = heroTpaConstruction(4, undefined, undefined, locale).angle?.value
  return (
    <HeroDemoScene className={styles.report} name="report">
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>{workspace("caseTitle")}</p><h3>{t("title")}</h3></div>
        <span className={styles.status}><CircleCheck size={12} strokeWidth={1.5} />{t("ready")}</span>
      </header>
      <div className={styles.content}>
        <figure className={styles.figure}>
          <div className={styles.image}>
            <Image alt="" fill loading="eager" sizes="(min-width: 1440px) 440px, (min-width: 992px) 30vw, 75vw" src={heroRadiograph.src} />
            <HeroProductAnnotations final locale={locale} />
          </div>
          <figcaption><ImageIcon size={11} strokeWidth={1.5} />{workflow("imageLabel")}<span>{mockup("lateralFile")}</span></figcaption>
        </figure>
        <div className={styles.summary}>
          <div><p className={styles.eyebrow}>{t("measurements")}</p>
            <div className={styles.measurement}>
              <Crosshair size={13.217} strokeWidth={1.5} /><span>{landmarks("entryTitle")}</span><strong>{angle}</strong><Check size={11} />
            </div>
          </div>
          <section className={styles.note}>
            <h4><NotebookPen size={13.217} strokeWidth={1.5} />{t("noteTitle")}</h4>
            <p>{t("note")}</p>
          </section>
          <div className={styles.professional}>
            <p className={styles.eyebrow}>{t("professional")}</p>
            <div className={styles.profile}>
              <Image alt="" height={24} src="/images/landing/img_doutor_hero.avif" width={24} />
              <div><p>{mockup("profileName")}</p><span>{mockup("clinicName")}</span></div>
            </div>
          </div>
        </div>
      </div>
      <footer className={styles.footer}>
        <span><Check size={12} />{t("footer")}</span>
        <HeroDemoButton className={styles.conclude} name="conclude" title={t("conclude")}>{t("conclude")}<ArrowRight size={13} strokeWidth={1.5} /></HeroDemoButton>
      </footer>
    </HeroDemoScene>
  )
}

export { HeroProductReport }
