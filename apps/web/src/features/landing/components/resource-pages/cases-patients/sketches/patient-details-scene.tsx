"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"

type PatientDetailsCopy = { name: string; save: string }

function PatientDetailsScene({ copy }: { copy: PatientDetailsCopy }) {
  const instance = useId().replace(/:/g, "")
  const nameClip = `patient-name-${instance}`

  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <defs>
        <clipPath id={nameClip}>
          <rect x="27" y="44.5" width="74" height="16" data-a="wipe" data-text="input-name" data-w="74" data-t=".32" data-d=".22" />
        </clipPath>
      </defs>
      <path className={styles.guide} d="M0 22.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M120.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={styles.line} x="12.5" y="22.5" width="102" height="106" rx="6" data-a="draw" data-t=".06" data-d=".18" />
      <path className={`${styles.line} ${styles.thin}`} d="M22 36H56" data-a="draw" data-t=".2" data-d=".05" />
      <rect className={`${styles.line} ${styles.thin}`} x="22.5" y="42.5" width="84" height="20" rx="3" data-a="draw" data-t=".22" data-d=".08" />
      <text className={styles.mini} x="28" y="56.5" clipPath={`url(#${nameClip})`} data-sketch-text="input-name">{copy.name}</text>
      <path className={styles.accentLine} d="M28 46.5V59.5" data-a="caret" data-text="input-name" data-w="74" data-t=".32" data-d=".22" data-out=".62" data-out-o="0" />
      <rect className={`${styles.line} ${styles.thin}`} x="22.5" y="70.5" width="84" height="20" rx="3" data-a="draw" data-t=".26" data-d=".08" />
      <path className={`${styles.line} ${styles.thin}`} d="M28 81H72" data-a="draw" data-t=".3" data-d=".05" />
      <g data-a="click" data-t=".66" data-d=".06">
        <rect className={styles.ink} x="22.5" y="100.5" width="56" height="17" rx="8.5" data-a="fade" data-t=".58" />
        <text className={styles.badge} x="50.5" y="112" textAnchor="middle" data-a="fade" data-t=".6">{copy.save}</text>
      </g>
      <path className={styles.accentLine} d="M80 109C104 109 106 76 130 72" strokeDasharray="2 4" data-a="draw" data-t=".7" data-d=".06" data-out=".95" data-out-o="0" />
      <rect className={styles.line} x="128.5" y="22.5" width="98" height="106" rx="6" data-a="draw" data-t=".1" data-d=".18" />
      <path className={styles.line} d="M128.5 34.5H226.5" data-a="draw" data-t=".24" data-d=".06" />
      <path className={styles.type} d="M138 50H188" data-a="draw" data-t=".3" data-d=".08" />
      <path className={`${styles.line} ${styles.thin}`} d="M138 60H210M138 66H198" data-a="draw" data-t=".34" data-d=".06" />
      <path className={`${styles.line} ${styles.thin}`} d="M138 82H190" data-a="draw" data-t=".36" data-d=".05" data-out=".74" data-out-o="0" />
      <text className={styles.mini} x="138" y="85" data-a="fade" data-t=".76">{copy.name}</text>
      <rect className={styles.accentLine} x="133.5" y="74.5" width="86" height="15" rx="3" data-a="draw" data-t=".78" data-d=".06" />
      <rect className={`${styles.line} ${styles.thin}`} x="138.5" y="100.5" width="34" height="12" rx="6" data-a="draw" data-t=".4" data-d=".06" />
    </svg>
  )
}

export { PatientDetailsScene }
