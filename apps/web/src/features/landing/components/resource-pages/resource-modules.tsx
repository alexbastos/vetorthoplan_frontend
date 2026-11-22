import type { ReactNode } from "react"

import styles from "./resource-pages.module.css"
import { ResourceReveal } from "./resource-reveal"
import { ResourceTitle } from "./resource-title"

function ResourceModules({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby="resource-modules-title" className={`${styles.container} ${styles.modules}`} id="resource-modules">
      <ResourceReveal as="header" className={styles.modulesHeading}>
        <ResourceTitle as="h2" className={styles.sectionTitle} id="resource-modules-title">{title}</ResourceTitle>
        <p>{description}</p>
      </ResourceReveal>
      <ul className={styles.moduleList} role="list">{children}</ul>
    </section>
  )
}

function ResourceModuleCard({ title, description, children, delay = 0 }: { title: string; description: string; children: ReactNode; delay?: number }) {
  return (
    <ResourceReveal as="li" className={styles.moduleCard} delay={delay}>
      {children}
      <div className={styles.moduleBody}>
        <h3 className={styles.moduleTitle}>{title}</h3>
        <p className={styles.moduleDescription}>{description}</p>
      </div>
    </ResourceReveal>
  )
}

export { ResourceModules, ResourceModuleCard }
