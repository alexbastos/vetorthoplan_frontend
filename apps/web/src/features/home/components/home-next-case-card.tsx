import Link from "next/link"
import { useTranslations } from "next-intl"

import styles from "./home-page.module.css"

function HomeNextCaseCard() {
  const t = useTranslations("home.nextCase")

  return (
    <Link className={styles.nextCaseCard} data-home-next-case href="/app/cases/new">
      <span aria-hidden="true" className={styles.nextCaseIcon}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M9 3.5h9.5l3 3v15H9a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2Z" fill="var(--color-surface-subtle)" stroke="currentColor" strokeWidth="0.9" />
          <path d="M18.5 3.5v3h3" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M6.5 7.5H17l3 3v13H6.5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" fill="var(--color-surface-card)" stroke="currentColor" strokeWidth="0.9" />
          <path d="M17 7.5v3h3M8 15h8M8 18h6" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="18.5" cy="20.5" r="5" fill="var(--color-surface-card)" stroke="currentColor" strokeWidth="0.9" />
          <path d="M18.5 18v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      </span>
      <div className={styles.nextCaseCopy}>
        <h2 className={styles.nextCaseTitle}>{t("title")}</h2>
        <p className={styles.nextCaseDescription}>{t("description")}</p>
      </div>
      <span className={styles.nextCaseAction}>{t("action")}</span>
    </Link>
  )
}

export { HomeNextCaseCard }
