"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"

type CaseTrackingCopy = { name: string; status: string }

function CaseTrackingScene({ copy }: { copy: CaseTrackingCopy }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const searchClip = `case-tracking-search-${instance}`, cursorPath = `case-tracking-cursor-${instance}`
  const lineThin = `${styles.line} ${styles.thin}`

  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <defs>
        <clipPath id={searchClip}>
          <rect x="48" y="49.5" width="84" height="13" data-a="wipe" data-text="case-search" data-w="84" data-t=".28" data-d=".18" />
        </clipPath>
      </defs>
      <path className={styles.guide} d="M0 20.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M24.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={styles.line} x="24.5" y="20.5" width="124" height="110" rx="8" data-a="draw" data-t=".08" data-d=".2" />
      <path className={styles.line} d="M24.5 40.5H148.5" data-a="draw" data-t=".22" data-d=".08" />
      <path className={styles.type} d="M35 31H77" data-a="draw" data-t=".2" data-d=".06" />
      <rect className={lineThin} x="34.5" y="48.5" width="104" height="15" rx="7.5" data-a="draw" data-t=".22" data-d=".08" />
      <circle className={lineThin} cx="41.5" cy="55" r="2.5" data-a="draw" data-t=".24" data-d=".05" />
      <path className={lineThin} d="M43.3 57L45.5 59" data-a="draw" data-t=".25" data-d=".04" />
      <text className={styles.mini} x="49" y="58.5" clipPath={`url(#${searchClip})`} data-sketch-text="case-search">{copy.name}</text>
      <path className={styles.accentLine} d="M49 51V60" data-a="caret" data-text="case-search" data-w="84" data-t=".28" data-d=".18" data-out=".48" data-out-o="0" />
      <path className={lineThin} d="M42 81H98" data-a="draw" data-t=".26" data-d=".06" data-out=".46" data-out-o="0" />
      <path className={lineThin} d="M34.5 90.5H138.5M34.5 108.5H138.5" data-a="draw" data-t=".26" data-d=".08" />
      <path className={lineThin} d="M42 100H88M42 118H81" data-a="draw" data-t=".3" data-d=".08" />
      <rect className={lineThin} x="115" y="96" width="16" height="6" rx="3" data-a="draw" data-t=".32" data-d=".05" />
      <rect className={lineThin} x="115" y="114" width="16" height="6" rx="3" data-a="draw" data-t=".34" data-d=".05" />
      <g data-a="click" data-t=".6" data-d=".06">
        <rect className={styles.accentLine} x="34.5" y="72.5" width="104" height="16" rx="3" data-a="draw" data-t=".54" data-d=".06" />
        <text className={styles.mini} x="42" y="83" data-a="fade" data-t=".54">{copy.name}</text>
        <circle className={styles.accent} cx="128" cy="80.5" r="2" data-a="pop" data-t=".6" />
      </g>
      <path id={cursorPath} d="M150 132C128 120 104 100 90 80" />
      <g data-a="follow" data-path={`#${cursorPath}`} data-t=".4" data-d=".16" data-out=".72" data-out-o="0">
        <path className={styles.cursor} d="M0 0V15L4 11.5L7 18L9.6 16.9L6.7 10.5H12Z" />
      </g>
      <g data-a="slide" data-sx="-14" data-t=".66" data-d=".12">
        <rect className={styles.line} x="156.5" y="48.5" width="76" height="48" rx="6" />
        <text className={styles.mini} x="164" y="63">{copy.name}</text>
        <path className={lineThin} d="M164 73H206M164 80H192" />
        <text className={styles.status} x="164" y="90">{copy.status}</text>
      </g>
      <circle className={styles.accent} cx="224" cy="96" r="8" data-a="pop" data-t=".78" />
      <path className={styles.check} d="M220 96l2.88 2.88l5.12 -5.76" data-a="draw" data-t=".82" data-d=".05" />
    </svg>
  )
}

export { CaseTrackingScene }
