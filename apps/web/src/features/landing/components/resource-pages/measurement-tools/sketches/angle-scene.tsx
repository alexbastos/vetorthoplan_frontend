"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"
import { angleSketchGeometry as geometry } from "./angle-sketch-geometry"
import { MeasurementImageContours } from "./measurement-image-contours"

type AngleCopy = { value: string }

function AngleScene({ copy }: { copy: AngleCopy }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const lineId = `angle-lines-${instance}`
  const thin = `${styles.line} ${styles.thin}`

  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 22.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M24.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />

      <rect className={styles.line} x="24.5" y="22.5" width="192" height="106" rx="8"
        data-a="draw" data-t=".06" data-d=".2" />
      <path className={styles.line} d="M24.5 38.5H216.5" data-a="draw" data-t=".2" data-d=".06" />
      {[33, 40, 47].map((x, index) => (
        <circle key={x} className={styles.soft} cx={x} cy="30.5" r="2"
          data-a="pop" data-t={.22 + index * .02} data-d=".04" />
      ))}
      <path className={styles.type} d="M59 30.5H94" data-a="draw" data-t=".24" data-d=".06" />
      <path className={thin} d="M181 33.5H202M181 33.5L196 26M188 33.5A7 7 0 0 0 187.35 30.55"
        data-a="draw" data-t=".26" data-d=".06" />

      <MeasurementImageContours />

      {/* Equal-length rays keep the cursor and stroke together through the vertex. */}
      <path className={styles.accentLine} id={lineId} d={geometry.measurement}
        data-a="draw" data-t=".34" data-d=".32" data-ease="none" />
      <circle className={styles.accent} cx={geometry.first.x} cy={geometry.first.y} r="2.8"
        data-a="pop" data-t=".32" data-d=".05" />
      <circle className={styles.accent} cx={geometry.vertex.x} cy={geometry.vertex.y} r="2.8"
        data-a="pop" data-t=".5" data-d=".05" />
      <circle className={styles.accent} cx={geometry.last.x} cy={geometry.last.y} r="2.8"
        data-a="pop" data-t=".66" data-d=".05" />
      <g data-a="follow" data-path={`#${lineId}`} data-t=".34" data-d=".32" data-out=".68" data-out-o="0">
        <path className={styles.cursor} d="M0 0V12L3.2 9.2L5.6 14.4L7.68 13.52L5.36 8.4H9.6Z" />
      </g>

      {/* The arc is centered on the actual vertex and appears after the third point. */}
      <path className={styles.accentLine} d={geometry.arc} data-a="draw" data-t=".68" data-d=".09" />
      <g data-a="slide" data-sx="-4" data-t=".78" data-d=".1">
        <rect className={styles.paper} x="140.5" y="74.5" width="43" height="18" rx="9" />
        <rect className={styles.accentLine} x="140.5" y="74.5" width="43" height="18" rx="9" />
        <text className={styles.mini} textAnchor="middle" x="162" y="86.2">{copy.value}</text>
      </g>
      <circle className={styles.accent} cx="198" cy="83.5" r="6.5" data-a="pop" data-t=".86" data-d=".06" />
      <path className={styles.check} d="M194.75 83.5l2.34 2.34l4.16 -4.68"
        data-a="draw" data-t=".9" data-d=".05" />
    </svg>
  )
}

export { AngleScene }
