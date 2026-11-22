import Image from "next/image"
import { useTranslations } from "next-intl"
import { ClipboardList, Dog, FileText, Images, Tag, UserRound } from "lucide-react"

import styles from "./patient-profile-scene.module.css"

// Reference canvas: 483 × 543 units. Groups retain the original 4.4s choreography.
function PatientProfileScene() {
  const t = useTranslations("orthovetLanding.clinicalCaseStory.patientProfile")
  const chips = [
    { key: "region", group: styles.gChip0, width: 123 },
    { key: "lateral", group: styles.gChip1, width: 106 },
    { key: "format", group: styles.gChip2, width: 63 },
    { key: "craniocaudal", group: styles.gChip3, width: 107 },
  ] as const
  const stats = [
    { key: "age", position: styles.sc0 },
    { key: "weight", position: styles.sc1 },
    { key: "exams", position: styles.sc2 },
    { key: "status", position: styles.sc3 },
  ] as const

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <span className={styles.avatar}>
          <Image alt="" src="/images/landing/3422243535333125.avif" width={146} height={146} />
        </span>

        <div className={`${styles.group} ${styles.gName}`}><span className={styles.name}>{t("name")}</span></div>
        <div className={`${styles.group} ${styles.gRole}`}><span className={styles.role}>{t("subtitle")}</span></div>
        <div className={`${styles.group} ${styles.gMeta}`}>
          <div className={styles.meta}>
            <span className={styles.metaItem}><Dog className={styles.metaIcon} /><span className={styles.metaLabel}>{t("species")}</span></span>
            <span className={styles.dot}>•</span>
            <span className={styles.metaItem}><Tag className={styles.metaIcon} /><span className={styles.metaLabel}>{t("breed")}</span></span>
            <span className={styles.dot}>•</span>
            <span className={styles.metaItem}><UserRound className={styles.metaIcon} /><span className={styles.metaLabel}>{t("professional")}</span></span>
          </div>
        </div>

        <span className={styles.hireWrap}><span className={styles.hire}>{t("openPlanning")}</span></span>
        <span className={styles.message}><Images className={styles.msgIcon} /><span className={styles.msgLabel}>{t("viewExams")}</span></span>
        <span className={`${styles.iconBtn} ${styles.iconBtn1}`} title={t("patientDetails")}><ClipboardList /></span>
        <span className={`${styles.iconBtn} ${styles.iconBtn2}`} title={t("caseNotes")}><FileText /></span>

        <div className={`${styles.group} ${styles.gSkills}`}><span className={styles.skillsLabel}>{t("examReferences")}</span></div>
        {chips.map(({ key, group, width }) => (
          <div className={`${styles.group} ${group}`} key={key}>
            <span className={styles.chip} style={{ width: `calc(${width} * var(--u))` }}>{t(`chips.${key}`)}</span>
          </div>
        ))}

        <div className={`${styles.group} ${styles.gPanel}`}>
          {[false, true].map((blurred) => (
            <div className={blurred ? styles.blurred : styles.sharp} key={String(blurred)} aria-hidden={blurred || undefined}>
              <div className={styles.panel}>
                {stats.map(({ key, position }) => (
                  <div className={`${styles.statCard} ${position}`} key={key}>
                    <span className={styles.statLabel}>{t(`stats.${key}.label`)}</span>
                    <span className={styles.statValue}>{t(`stats.${key}.value`)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { PatientProfileScene }
