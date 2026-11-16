import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import styles from "./home-page.module.css"

type HomeShortcutCardProps = {
  title: string
  description: string
  href?: string
  icon: ReactNode
  illustration?: ReactNode
}

function HomeShortcutCard({ title, description, href, icon, illustration }: HomeShortcutCardProps) {
  const className = `${styles.shortcutCard} ${illustration ? styles.shortcutCardWithIllustration : ""} ${href ? styles.shortcutLink : ""}`
  const content = (
    <>
      {illustration ? (
        <div aria-hidden="true" className={styles.shortcutIllustration}>{illustration}</div>
      ) : null}
      <div className={styles.shortcutBody}>
        <span aria-hidden="true" className={styles.shortcutIcon}>
          {icon}
        </span>
        <h3 className={styles.shortcutTitle}>{title}</h3>
        <div className={styles.shortcutFooter}>
          <span>{description}</span>
          {href ? (
            <span aria-hidden="true" className={styles.shortcutArrow}>
              <ArrowUpRight size={17} strokeWidth={1.6} />
            </span>
          ) : null}
        </div>
      </div>
    </>
  )

  return href ? (
    <Link className={className} data-home-shortcut-card href={href}>{content}</Link>
  ) : (
    <article className={className} data-home-shortcut-card>{content}</article>
  )
}

export { HomeShortcutCard }
