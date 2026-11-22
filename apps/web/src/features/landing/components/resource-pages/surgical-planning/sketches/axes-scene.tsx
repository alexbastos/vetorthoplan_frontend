"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { PlanningSketchCanvas } from "./planning-sketch-canvas"
import { tibialAxisGeometry as geometry } from "./planning-tibia-geometry"
import { PlanningSketchResult } from "./planning-sketch-result"

function AxesScene({ value }: { value: string }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const axisId = `planning-axis-${instance}`

  return (
    <PlanningSketchCanvas tool="axes">
      <circle className={styles.accentLine} cx={geometry.joint.x} cy={geometry.joint.y} r={geometry.proximalRingRadius}
        data-a="draw" data-t=".44" data-d=".1" />
      <circle className={styles.accentLine} cx={geometry.distal.x} cy={geometry.distal.y} r={geometry.distalRingRadius}
        data-a="draw" data-t=".58" data-d=".1" />
      <path className={styles.accentLine} id={axisId} d={geometry.axis}
        data-a="draw" data-t=".7" data-d=".14" data-ease="none" />
      <circle className={styles.accent} cx={geometry.joint.x} cy={geometry.joint.y} r="2.8"
        data-a="pop" data-t=".42" data-d=".05" />
      <circle className={styles.accent} cx={geometry.distal.x} cy={geometry.distal.y} r="2.8"
        data-a="pop" data-t=".56" data-d=".05" />
      <g data-a="follow" data-path={`#${axisId}`} data-t=".7" data-d=".14" data-out=".85" data-out-o="0">
        <g transform="scale(.7)">
          <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
        </g>
      </g>
      <g opacity=".5">
        <path className={styles.accentLine} d={geometry.labelConnection}
          data-a="draw" data-t=".85" data-d=".06" />
      </g>
      <PlanningSketchResult value={value} y={90} at={.91} />
    </PlanningSketchCanvas>
  )
}

export { AxesScene }
