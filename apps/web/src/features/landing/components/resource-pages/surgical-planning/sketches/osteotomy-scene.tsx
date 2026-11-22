"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { PlanningSketchCanvas } from "./planning-sketch-canvas"
import { planningOsteotomy as geometry } from "./planning-sketch-geometry"
import { PlanningSketchResult } from "./planning-sketch-result"

function OsteotomyScene({ value, reference }: { value: string; reference: string }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const radiusId = `planning-cut-radius-${instance}`
  const cutId = `planning-cut-arc-${instance}`

  return (
    <PlanningSketchCanvas tool="osteotomy">
      <path className={styles.accentLine} id={radiusId} d={geometry.radius}
        data-a="draw" data-t=".46" data-d=".14" data-ease="none" />
      <circle className={styles.accent} cx={geometry.center.x} cy={geometry.center.y} r="1.6"
        data-a="pop" data-t=".42" data-d=".04" />
      <circle className={styles.accent} cx={geometry.edge.x} cy={geometry.edge.y} r="1.6"
        data-a="pop" data-t=".6" data-d=".04" />
      <g data-a="follow" data-path={`#${radiusId}`} data-t=".46" data-d=".14" data-out=".62" data-out-o="0">
        <g transform="scale(.7)">
          <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
        </g>
      </g>
      <g opacity=".18">
        <path className={`${styles.line} ${styles.thin}`} d={geometry.guideCircle} data-a="draw" data-t=".64" data-d=".16" data-ease="none" />
      </g>
      <path className={`${styles.accentLine} ${styles.emphasisLine}`} id={cutId} d={geometry.arc}
        data-a="draw" data-t=".84" data-d=".18" data-ease="none" />
      <g data-a="follow" data-path={`#${cutId}`} data-t=".84" data-d=".18" data-out="1.04" data-out-o="0">
        <g transform="scale(.7)">
          <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
        </g>
      </g>
      <g opacity=".5">
        <path className={`${styles.line} ${styles.thin}`} d={geometry.reference} data-a="draw" data-t="1.04" data-d=".1" />
        <path className={styles.accentLine} d={geometry.labelConnection} data-a="draw" data-t="1.08" data-d=".06" />
      </g>
      <text className={styles.mini} x={geometry.referenceLabel.x} y={geometry.referenceLabel.y}
        data-a="fade" data-t="1.14" data-d=".06">{reference}</text>
      <PlanningSketchResult value={value} y={geometry.resultY} at={1.14} />
    </PlanningSketchCanvas>
  )
}

export { OsteotomyScene }
