import Image from "next/image"
import { Plus, Search } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { workflowRadiographs } from "../hero/workflow-radiographs"
import { heroRadiograph } from "./hero-product-measurements"
import styles from "./hero-product-cases.module.css"
import { HeroDemoCaseCount, HeroDemoCaseRow, HeroDemoScene } from "./hero-product-demo-elements"

const filters = ["all", "DRAFT", "IN_PLANNING", "READY", "ARCHIVED"] as const
const counts = { all: 4, DRAFT: 1, IN_PLANNING: 2, READY: 1, ARCHIVED: 0 }
const cases = [
  { code: "OV-0248", name: "Luna", profile: "mixedDog", status: "IN_PLANNING", date: "2026-11-19", src: heroRadiograph.src, primary: true },
  { code: "OV-0247", name: "Thor", profile: "goldenDog", status: "IN_PLANNING", date: "2026-11-18", src: workflowRadiographs.craniocaudal.src, primary: false },
  { code: "OV-0246", name: "Nina", profile: "mixedCat", status: "READY", date: "2026-11-17", src: workflowRadiographs.oblique.src, primary: false },
  { code: "OV-0245", name: "Bento", profile: "mixedDog", status: "DRAFT", date: "2026-11-16", src: null, primary: false },
] as const

async function HeroProductCases() {
  const [t, copy, locale] = await Promise.all([
    getTranslations("cases"),
    getTranslations("orthovetLanding.heroRebrand.caseList"),
    getLocale(),
  ])
  const dates = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" })
  return (
    <HeroDemoScene className={styles.cases} label={t("list.title")} name="cases">
      <header className={styles.heading}>
        <div><h3>{t("title")}</h3><p>{t("description")}</p></div>
        <button className={styles.newCase} type="button"><Plus aria-hidden="true" size={13.217} strokeWidth={1.5} />{t("actions.newCase")}</button>
      </header>

      <div className={styles.filters}>
        <div aria-label={t("list.filters.label")} className={styles.tabs}>
          {filters.map(filter => <span className={styles.tab} data-active={filter === "all"} key={filter}>
            {t(`list.filters.${filter}`)}<HeroDemoCaseCount filter={filter}>{counts[filter]}</HeroDemoCaseCount>
          </span>)}
        </div>
        <button aria-label={t("list.search.open")} className={styles.search} title={t("list.search.description")} type="button"><Search size={13.217} strokeWidth={1.5} /></button>
      </div>

      <ul className={styles.rows}>
        {cases.map(item => <HeroDemoCaseRow className={styles.row} key={item.code} primary={item.primary}>
          <div className={styles.thumbnail}>
            {item.src ? <Image alt="" fill sizes="52px" src={item.src} /> : <span>{t("list.previewUnavailable")}</span>}
          </div>
          <div className={styles.cell}>
            <p className={styles.label}>{t("list.columns.case")}</p>
            <h4><button className={styles.caseTitle} data-hero-open-case={item.primary ? "true" : undefined} type="button">{copy("caseCode", { code: item.code })}</button></h4>
          </div>
          <div className={styles.cell}><p className={styles.label}>{t("list.columns.patient")}</p><p className={styles.value}>{item.name}</p></div>
          <div className={styles.cell}><p className={styles.label}>{t("list.columns.profile")}</p><p className={styles.value}>{copy(`profiles.${item.profile}`)}</p></div>
          <div className={styles.cell}>
            <p className={styles.label}>{t("list.columns.status")}</p>
            <span className={styles.badge} data-status={item.status} data-hero-primary-status={item.primary ? "true" : undefined}>{t(`list.status.${item.status}`)}</span>
            {item.primary ? <span className={styles.badge} data-status="READY" data-hero-completed-status>{t("list.status.READY")}</span> : null}
          </div>
          <div className={`${styles.cell} ${styles.date}`}>
            <p className={styles.label}>{t("list.columns.updatedAt")}</p><time dateTime={item.date}>{dates.format(new Date(`${item.date}T12:00:00Z`))}</time>
          </div>
        </HeroDemoCaseRow>)}
      </ul>
    </HeroDemoScene>
  )
}

export { HeroProductCases }
