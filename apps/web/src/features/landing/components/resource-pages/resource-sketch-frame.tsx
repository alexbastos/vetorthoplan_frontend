import type { ReactNode } from "react"

import styles from "./resource-pages.module.css"

// Same stage structure for every module: code, scalable SVG scene, scale marker.
function ResourceSketchFrame({ code, children }: { code: string; children?: ReactNode }) {
  return (
    <div aria-hidden="true" className={styles.sketchFrame} data-has-artwork={Boolean(children)}>
      <span className={styles.sketchCode}>{code}</span>
      <div className={styles.sketchArtwork}>{children}</div>
      <span className={styles.sketchScale}>1 : 1</span>
    </div>
  )
}

export { ResourceSketchFrame }
