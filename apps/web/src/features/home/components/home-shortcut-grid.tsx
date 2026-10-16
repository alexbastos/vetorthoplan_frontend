import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { HomeShortcutCard } from "./home-shortcut-card"
import styles from "./home-page.module.css"

function HomeShortcutGrid() {
  const t = useTranslations("home.shortcuts")

  return (
    <section aria-labelledby="home-shortcuts-title" className={styles.shortcuts} data-home-shortcuts>
      <div className={styles.shortcutsHeading} data-home-shortcuts-heading>
        <h2 className="text-[20px] font-bold tracking-[-0.02em] text-foreground sm:text-[22px]" id="home-shortcuts-title">{t("title")}</h2>
        <Link className={styles.shortcutsAll} href="/app/cases">
          {t("viewAll")}
          <ChevronRight aria-hidden="true" size={15} strokeWidth={1.7} />
        </Link>
      </div>
      <div aria-hidden="true" className="mt-3.5 mb-5 h-px bg-border" data-home-shortcuts-divider />
      <ul className="grid gap-[18px] md:grid-cols-3">
        <li data-home-shortcut-item><HomeShortcutCard description={t("openCases")} href="/app/cases" riffle title={t("cases")} /></li>
        <li data-home-shortcut-item><HomeShortcutCard description={t("preparing")} index="02" title={t("comingSoon")} /></li>
        <li data-home-shortcut-item><HomeShortcutCard description={t("preparing")} index="03" title={t("comingSoon")} /></li>
      </ul>
    </section>
  )
}

export { HomeShortcutGrid }
