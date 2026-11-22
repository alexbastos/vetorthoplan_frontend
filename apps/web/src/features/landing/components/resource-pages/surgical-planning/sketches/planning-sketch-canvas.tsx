import type { ReactNode } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { PlanningTibiaContours } from "./planning-tibia-contours"

const toolPaths = {
  axes: "M186 27V34M197 27V34M186 30.5H197",
  orientation: "M181 33.5H202M181 33.5L196 26M188 33.5A7 7 0 0 0 187.35 30.55",
  osteotomy: "M182 33A10 10 0 0 1 202 33M192 26V33",
} as const

function PlanningSketchCanvas({ tool, children }: { tool: keyof typeof toolPaths; children: ReactNode }) {
  const thin = `${styles.line} ${styles.thin}`

  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 22.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M24.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={styles.line} x="24.5" y="22.5" width="192" height="106" rx="8" data-a="draw" data-t=".06" data-d=".2" />
      <path className={styles.line} d="M24.5 38.5H216.5" data-a="draw" data-t=".2" data-d=".06" />
      {[33, 40, 47].map((x, index) => (
        <circle key={x} className={styles.soft} cx={x} cy="30.5" r="2" data-a="pop" data-t={.22 + index * .02} data-d=".04" />
      ))}
      <path className={styles.type} d="M59 30.5H94" data-a="draw" data-t=".24" data-d=".06" />
      <path className={thin} d={toolPaths[tool]} data-a="draw" data-t=".26" data-d=".06" />
      <PlanningTibiaContours />
      {children}
    </svg>
  )
}

export { PlanningSketchCanvas }
