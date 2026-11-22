"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { MeasurementImageContours } from "./measurement-image-contours"

type DistanceCopy = { value: string }

// One geometry source keeps the two handles, line and cursor exactly aligned.
const start = { x: 66.5, y: 102.5 }
const end = { x: 172.5, y: 58.5 }
const measurement = `M${start.x} ${start.y}L${end.x} ${end.y}`

function DistanceScene({ copy }: { copy: DistanceCopy }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const lineId = `distance-line-${instance}`
  const thin = `${styles.line} ${styles.thin}`

  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 22.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M24.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />

      {/* Abstract viewing window: the stage grid remains visible through it. */}
      <rect className={styles.line} x="24.5" y="22.5" width="192" height="106" rx="8"
        data-a="draw" data-t=".06" data-d=".2" />
      <path className={styles.line} d="M24.5 38.5H216.5" data-a="draw" data-t=".2" data-d=".06" />
      {[33, 40, 47].map((x, index) => (
        <circle key={x} className={styles.soft} cx={x} cy="30.5" r="2"
          data-a="pop" data-t={.22 + index * .02} data-d=".04" />
      ))}
      <path className={styles.type} d="M59 30.5H94" data-a="draw" data-t=".24" data-d=".06" />
      <path className={thin} d="M180 30.5H202M180 30.5L183 28M180 30.5L183 33M202 30.5L199 28M202 30.5L199 33"
        data-a="draw" data-t=".26" data-d=".06" />

      <MeasurementImageContours />
      <path className={thin} d="M36 115.5H76M36.5 112V119M46.5 114V118M56.5 112V119M66.5 114V118M76.5 112V119"
        data-a="draw" data-t=".28" data-d=".1" />

      {/* Both the line and pointer travel from the first handle to the second. */}
      <path className={styles.accentLine} id={lineId} d={measurement}
        data-a="draw" data-t=".36" data-d=".22" data-ease="none" />
      <circle className={styles.accent} cx={start.x} cy={start.y} r="2.8"
        data-a="pop" data-t=".34" data-d=".05" />
      <circle className={styles.accent} cx={end.x} cy={end.y} r="2.8"
        data-a="pop" data-t=".58" data-d=".05" />
      <g data-a="follow" data-path={`#${lineId}`} data-t=".36" data-d=".22" data-out=".6" data-out-o="0">
        <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
      </g>

      <g data-a="slide" data-sx="-4" data-t=".64" data-d=".1">
        <rect className={styles.paper} x="126.5" y="89.5" width="58" height="18" rx="9" />
        <rect className={styles.accentLine} x="126.5" y="89.5" width="58" height="18" rx="9" />
        <text className={styles.mini} textAnchor="middle" x="155.5" y="101.2">{copy.value}</text>
      </g>
      <circle className={styles.accent} cx="198" cy="98.5" r="6.5" data-a="pop" data-t=".76" data-d=".06" />
      <path className={styles.check} d="M194.75 98.5l2.34 2.34l4.16 -4.68"
        data-a="draw" data-t=".8" data-d=".05" />
    </svg>
  )
}

export { DistanceScene }
