import { Riffle } from "@lucasmarkes/hairline/react"
import { ArrowUpRight, ClipboardList } from "lucide-react"
import Link from "next/link"

import styles from "./home-page.module.css"

type HomeShortcutCardProps = {
  title: string
  description: string
  href?: string
  index?: string
  riffle?: boolean
}

function HomeShortcutCard({ title, description, href, index, riffle = false }: HomeShortcutCardProps) {
  const className = `${styles.shortcutCard} ${riffle ? styles.shortcutCardWithRiffle : ""} ${href ? styles.shortcutLink : ""}`
  const content = (
    <>
      {riffle ? (
        <Riffle aria-hidden="true" className={styles.shortcutRiffle} intensity={0.35} tabIndex={-1} />
      ) : null}
      <div className={styles.shortcutBody}>
        <span aria-hidden="true" className={styles.shortcutIcon}>
          {index ?? <ClipboardList size={17} strokeWidth={1.6} />}
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
