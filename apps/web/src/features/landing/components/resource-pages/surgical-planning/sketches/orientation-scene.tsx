"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { PlanningSketchCanvas } from "./planning-sketch-canvas"
import { PlanningSketchResult } from "./planning-sketch-result"
import { planningTpaGeometry as geometry } from "./planning-tpa-geometry"

function OrientationScene({ value }: { value: string }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const plateauId = `planning-plateau-${instance}`
  const axisId = `planning-tpa-axis-${instance}`

  return (
    <PlanningSketchCanvas tool="orientation">
      {/* Match the product's placement order: plateau first, then tibial axis. */}
      <path className={styles.accentLine} id={plateauId} d={geometry.plateau}
        data-a="draw" data-t=".46" data-d=".12" data-ease="none" />
      {[geometry.cranial, geometry.caudal].map((point, index) => (
        <circle className={styles.accent} key={index} cx={point.x} cy={point.y} r="1.6"
          data-a="pop" data-t={index === 0 ? .42 : .46 + .12 * geometry.plateauCaudalProgress} data-d=".04" />
      ))}
      <g data-a="follow" data-path={`#${plateauId}`} data-t=".46" data-d=".12" data-out=".6" data-out-o="0">
        <g transform="scale(.7)">
          <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
        </g>
      </g>
      <path className={styles.accentLine} id={axisId} d={geometry.axis}
        data-a="draw" data-t=".7" data-d=".14" data-ease="none" />
      {[geometry.axisStart, geometry.distal].map((point, index) => (
        <circle className={styles.accent} key={index} cx={point.x} cy={point.y} r="1.6"
          data-a="pop" data-t={index === 0 ? .66 : .84} data-d=".04" />
      ))}
      <g data-a="follow" data-path={`#${axisId}`} data-t=".7" data-d=".14" data-out=".86" data-out-o="0">
        <g transform="scale(.7)">
          <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
        </g>
      </g>
      <g opacity=".5">
        <path className={`${styles.line} ${styles.thin}`} d={geometry.perpendicular} data-a="draw" data-t=".9" data-d=".08" />
      </g>
      <path className={`${styles.accentLine} ${styles.emphasisLine}`} d={geometry.angle} data-a="draw" data-t=".99" data-d=".08" />
      <g opacity=".5">
        <path className={styles.accentLine} d={geometry.labelConnection} data-a="draw" data-t="1.07" data-d=".06" />
      </g>
      <PlanningSketchResult value={value} y={geometry.resultY} at={1.13} />
    </PlanningSketchCanvas>
  )
}

export { OrientationScene }
