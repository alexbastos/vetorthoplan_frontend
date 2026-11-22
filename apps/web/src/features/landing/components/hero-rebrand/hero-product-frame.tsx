import type { ReactNode } from "react"

import styles from "./hero-product-frame.module.css"
import { HeroProductCursor } from "./hero-product-cursor"
import { HeroProductMotion } from "./hero-product-motion"

type HeroProductFrameProps = {
  sidebar?: ReactNode
  workspace?: ReactNode
}

function HeroProductFrame({ sidebar, workspace }: HeroProductFrameProps) {
  return (
    <HeroProductMotion className={styles.viewport}>
      <div className={styles.stage}>
        <div className={styles.root}>
          <div className={styles.dashboard} data-hero-dashboard>
            <div className={styles.frame}>
              <aside className={styles.sidebar} data-slot="hero-product-sidebar">
                {sidebar}
              </aside>
              <div className={styles.workspace} data-slot="hero-product-workspace">
                {workspace}
              </div>
            </div>
            <HeroProductCursor />
          </div>
        </div>
      </div>
    </HeroProductMotion>
  )
}

export { HeroProductFrame }
