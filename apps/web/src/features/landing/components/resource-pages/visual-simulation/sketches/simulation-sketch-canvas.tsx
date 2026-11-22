import type { ReactNode } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { PlanningTibiaContours } from "../../surgical-planning/sketches/planning-tibia-contours"
import { simulationSketchGeometry as geometry } from "./simulation-sketch-geometry"

const toolPaths = {
  fragment: "M183 33L187 26H198L202 33Z",
  rotation: "M188 28A5 5 0 1 1 187 33M188 25V29H184",
  review: "M185 26H196L200 30V35H185ZM195 26V31H200M188 32L190 34L194 30",
} as const

function SimulationSketchCanvas({ contentClipId, children, tool = "fragment", anatomyTransform = geometry.anatomyTransform, showAnatomy = true }: {
  contentClipId: string; children: ReactNode; tool?: keyof typeof toolPaths; anatomyTransform?: string; showAnatomy?: boolean;
}) {
  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <defs><clipPath id={contentClipId}><rect {...geometry.contentClip} /></clipPath></defs>
      <path className={styles.guide} d="M0 22.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M24.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={styles.line} x="24.5" y="22.5" width="192" height="106" rx="8" data-a="draw" data-t=".06" data-d=".2" />
      <path className={styles.line} d="M24.5 38.5H216.5" data-a="draw" data-t=".2" data-d=".06" />
      {[33, 40, 47].map((x, index) => (
        <circle key={x} className={styles.soft} cx={x} cy="30.5" r="2" data-a="pop" data-t={.22 + index * .02} data-d=".04" />
      ))}
      <path className={styles.type} d="M59 30.5H94" data-a="draw" data-t=".24" data-d=".06" />
      <path className={`${styles.line} ${styles.thin}`} d={toolPaths[tool]} data-a="draw" data-t=".26" data-d=".06" />
      <g clipPath={`url(#${contentClipId})`}>
        {showAnatomy && (
          <g transform={anatomyTransform}>
            <PlanningTibiaContours strokeWidth={.8 / geometry.zoom} />
          </g>
        )}
        {children}
      </g>
    </svg>
  )
}

export { SimulationSketchCanvas }
