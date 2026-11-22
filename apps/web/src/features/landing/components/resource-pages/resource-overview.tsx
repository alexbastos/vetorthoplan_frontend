import Image from "next/image"
import type { ReactNode } from "react"

import styles from "./resource-pages.module.css"
import { ResourceOverviewMotion } from "./resource-overview-motion"
import { ResourceTitle } from "./resource-title"

type ResourceOverviewProps = {
  title: string
  lead: string
  image: { src: string; alt: string; unoptimized?: boolean }
  children: ReactNode
}

function ResourceOverview({ title, lead, image, children }: ResourceOverviewProps) {
  return (
    <ResourceOverviewMotion className={`${styles.container} ${styles.overview}`}>
      <div className={styles.overviewMedia} data-overview-image>
        <Image alt={image.alt} className={styles.overviewImage} fill src={image.src} unoptimized={image.unoptimized}
          sizes="(min-width: 1408px) 600px, (min-width: 992px) calc(50vw - 104px), (min-width: 640px) calc(100vw - 64px), calc(100vw - 48px)" />
      </div>
      <div className={styles.overviewContent}>
        <ResourceTitle as="h2" className={styles.overviewTitle} id="resource-overview-title">{title}</ResourceTitle>
        <div className={styles.overviewCopy} data-overview-copy>
          <p className={styles.overviewLead}>{lead}</p>
          {children}
        </div>
      </div>
    </ResourceOverviewMotion>
  )
}

export { ResourceOverview }
