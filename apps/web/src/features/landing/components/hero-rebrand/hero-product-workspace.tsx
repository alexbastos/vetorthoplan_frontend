import { ChevronLeft, ChevronRight, ClipboardList, Minus, RotateCw, Search, Sun, X, type LucideIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { HeroProductViewer } from "./hero-product-viewer"
import { HeroProductReport } from "./hero-product-report"
import { HeroProductSavedToast } from "./hero-product-save-feedback"
import { HeroProductCases } from "./hero-product-cases"
import styles from "./hero-product-workspace.module.css"
import { HeroDemoScene, HeroDemoTitle } from "./hero-product-demo-elements"

async function HeroProductWorkspace() {
  const [t, theme, cases] = await Promise.all([
    getTranslations("orthovetLanding.heroRebrand.workspace"),
    getTranslations("cases.workspace.theme"),
    getTranslations("cases"),
  ])

  return (
    <div className={styles.workspace} data-hero-workspace>
      <header className={styles.header}>
        <div className={styles.headerNavigation}>
          <WindowAction icon={ChevronLeft} label={t("back")} name="back" />
          <WindowAction icon={ChevronRight} label={t("forward")} name="forward" />
          <WindowAction icon={RotateCw} label={t("reload")} name="reload" />
          <WindowAction icon={Search} label={t("search")} name="search" />
        </div>

        <HeroDemoTitle className={styles.caseName} detail={t("caseTitle")} list={cases("title")} />

        <div className={styles.headerActions}>
          <span className={styles.caseInfo}>
            <WindowAction icon={ClipboardList} label={t("caseDetails")} name="case-details" />
          </span>
          <WindowAction icon={Minus} label={t("minimize")} name="minimize" />
          <WindowAction icon={Sun} label={theme("label")} name="theme" />
          <WindowAction icon={X} label={t("close")} name="close" />
        </div>
      </header>

      <div className={styles.body}>
        <HeroProductCases />
        <HeroDemoScene className={styles.viewerScene} name="viewer"><HeroProductViewer /></HeroDemoScene>
        <HeroProductReport />
      </div>
      <HeroProductSavedToast />
    </div>
  )
}

function WindowAction({ icon: Icon, label, name }: { icon: LucideIcon; label: string; name: string }) {
  return (
    <span className={styles.headerControl} data-hero-window-action={name} title={label}>
      <Icon size={14} strokeWidth={1.5} />
    </span>
  )
}

export { HeroProductWorkspace }
