import Link from "next/link"
import type { ReactNode } from "react"

import styles from "./resource-pages.module.css"
import { ResourceTitle } from "./resource-title"
import { ResourcePresentationMotion } from "./resource-presentation-motion"

type ResourcePresentationProps = {
  title: string
  tagline: string
  breadcrumbLabel: string
  resourcesLabel: string
  facts?: ReactNode
  children?: ReactNode
}

function ResourcePresentation({ title, tagline, breadcrumbLabel, resourcesLabel, facts, children }: ResourcePresentationProps) {
  return (
    <ResourcePresentationMotion className={`${styles.container} ${styles.presentation}`} hasVisual={Boolean(children)}>
      <div className={styles.presentationCopy}>
        <nav aria-label={breadcrumbLabel} className={styles.breadcrumb}>
          <ol>
            <li><Link href="/#resources">{resourcesLabel}</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <ResourceTitle>{title}</ResourceTitle>
        <p className={styles.tagline} data-resource-tagline>{tagline}</p>
        {facts}
      </div>
      {children ? <div className={styles.presentationVisual} data-resource-visual>{children}</div> : null}
    </ResourcePresentationMotion>
  )
}

export { ResourcePresentation }
