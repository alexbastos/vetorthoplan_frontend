import Image from "next/image"
import { useTranslations } from "next-intl"
import { ArrowUpRight, Check, Crosshair, FolderCheck, ImageIcon, Ruler } from "lucide-react"

import styles from "./saved-plan-scene.module.css"

// A saving confirmation, using the reference's 15-segment arc and record list.
// The illustration has no connection to authenticated case data or save actions.
const ticks = Array.from({ length: 15 }, (_, index) => {
  const angle = Math.PI - (index / 14) * Math.PI
  const point = (radius: number) => `${(241.5 + Math.cos(angle) * radius).toFixed(3)} ${(140 - Math.sin(angle) * radius).toFixed(3)}`
  return `M${point(86)} L${point(101)}`
})
const records = [
  { key: "radiograph", Icon: ImageIcon, animation: styles.row0 },
  { key: "calibration", Icon: Ruler, animation: styles.row1 },
  { key: "landmarks", Icon: Crosshair, animation: styles.row2 },
  { key: "plan", Icon: FolderCheck, animation: styles.row3 },
] as const

function SavedPlanScene() {
  const t = useTranslations("orthovetLanding.clinicalCaseStory.savedPlan")

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <svg className={styles.gauge} viewBox="0 0 483 543" aria-hidden="true">
          {ticks.map((path, index) => (
            <g key={index}>
              <path d={path} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={7} strokeLinecap="round" />
              <path className={`${styles.tick} ${styles[`tick${index}`]}`} d={path} fill="none" stroke="#e0f5ff" strokeWidth={7} strokeLinecap="round" />
            </g>
          ))}
        </svg>

        <div className={styles.saveIndicator}>
          <span className={styles.savingRing} />
          <span className={styles.confirmed}><Check strokeWidth={2} /></span>
        </div>
        <div className={styles.saveLabel}>
          <span className={styles.savingLabel}>{t("saving")}</span>
          <span className={styles.savedLabel}>{t("saved")}</span>
        </div>
        <span className={styles.subtitle}>{t("subtitle")}</span>

        <div className={styles.caseHeader}>
            <Image className={styles.avatar} alt="" width={70} height={70} src="/images/landing/3422243535333125.avif" />
            <span className={styles.caseIdentity}><strong>{t("patient")}</strong><small>{t("case")}</small></span>
            <span className={styles.viewCase}>{t("viewCase")}<ArrowUpRight /></span>
        </div>
        <div className={styles.listHeading}><span>{t("records")}</span><span>04</span></div>

          {records.map(({ key, Icon, animation }) => (
            <div className={`${styles.recordRow} ${animation}`} key={key}>
              {[false, true].map((blurred) => (
                <div className={blurred ? styles.blurred : styles.sharp} key={String(blurred)} aria-hidden={blurred || undefined}>
                  <div className={styles.rowContent}>
                    <Icon className={styles.recordIcon} />
                    <span className={styles.recordName}>{t(`items.${key}.name`)}</span>
                    <span className={styles.recordStatus}><span />{t(`items.${key}.status`)}</span>
                    <Check className={styles.recordCheck} />
                  </div>
                </div>
              ))}
            </div>
          ))}

        <div className={styles.professional}>
            <Image alt="" className={styles.professionalAvatar} width={40} height={40} src="/images/landing/img_doutor_hero.avif" />
            <span><small>{t("responsible")}</small><strong>{t("professional")}</strong></span>
        </div>
        <span className={styles.savedBadge}><Check />{t("allSaved")}</span>
      </div>
    </div>
  )
}

export { SavedPlanScene }
