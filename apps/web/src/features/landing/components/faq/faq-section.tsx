import type { ReactNode } from "react"

import { landingReferenceFonts } from "../landing-reference-fonts"
import { LandingSectionDivider } from "../landing-section-divider"
import { ResourceTitle } from "../resource-pages/resource-title"
import { FaqEntrance } from "./faq-entrance"
import styles from "./faq-section.module.css"

type FaqItem = {
  id: string
  question: string
  answer: ReactNode
}

type FaqSectionProps = {
  id: string
  eyebrow: string
  title: string
  items: readonly FaqItem[]
  variant?: "default" | "resource"
}

// Native disclosure state stays with the browser. A unique section ID also
// isolates accordion groups when several FAQs are rendered on the same page.
function FaqSection({ id, eyebrow, title, items, variant = "default" }: FaqSectionProps) {
  if (items.length === 0) return null

  const titleId = `${id}-title`
  const groupName = `${id}-accordion`
  const showDividers = variant !== "resource"

  return (
    <section id={id} aria-labelledby={titleId} className={`${styles.section} ${landingReferenceFonts}`} data-variant={variant}>
      {showDividers ? <div className={styles.hairline}><LandingSectionDivider /></div> : null}
      <div className={styles.shell}>
        <FaqEntrance className={styles.container}>
          {showDividers ? <>
            <span className={`${styles.rail} ${styles.railLeft}`} aria-hidden="true" />
            <span className={`${styles.rail} ${styles.railRight}`} aria-hidden="true" />
          </> : null}
          <header className={styles.header}>
            <p className={styles.eyebrow} data-faq-eyebrow>{eyebrow}</p>
            <ResourceTitle as="h2" id={titleId} className={styles.title}>{title}</ResourceTitle>
          </header>
          <div className={styles.items}>
            {items.map(item => (
              <details className={styles.item} id={`${id}-${item.id}`} name={groupName} key={item.id} data-faq-item>
                <summary className={styles.summary}>
                  <h3 className={styles.question}>
                    <span className={styles.questionText}>
                      <span className={styles.dot} aria-hidden="true" />
                      <span>{item.question}</span>
                    </span>
                    <svg className={styles.icon} width="16" height="16" fill="none" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M2.5 8h11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
                      <path className={styles.iconBar} d="M8 2.5v11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
                    </svg>
                  </h3>
                </summary>
                <p className={styles.answer}>{item.answer}</p>
              </details>
            ))}
          </div>
        </FaqEntrance>
      </div>
      {showDividers ? <div className={styles.hairline}><LandingSectionDivider /></div> : null}
    </section>
  )
}

export { FaqSection }
export type { FaqItem, FaqSectionProps }
