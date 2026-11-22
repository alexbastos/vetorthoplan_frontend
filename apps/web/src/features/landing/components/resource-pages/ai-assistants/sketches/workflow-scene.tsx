"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"

type WorkflowCopy = { organize: string; prepare: string; review: string }

function WorkflowScene({ copy }: { copy: WorkflowCopy }) {
  const instance = useId().replace(/:/g, "")
  const connections = [
    { id: `workflow-input-${instance}`, d: "M58.5 75.5C74 75.5 72 43.5 88.5 43.5", at: .3, duration: .1, out: .4 },
    { id: `workflow-agents-${instance}`, d: "M118.5 62.5V87.5", at: .53, duration: .09, out: .62 },
    { id: `workflow-output-${instance}`, d: "M148.5 106.5C165 106.5 162 75.5 178.5 75.5", at: .74, duration: .12, out: .86 },
  ]

  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 75.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M118.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />
      {connections.map(({ id, d, at, duration, out }) => (
        <g key={id}>
          <path id={id} className={styles.accentLine} d={d} data-a="draw" data-t={at} data-d={duration} />
          <circle className={styles.accent} cx="0" cy="0" r="2.2" data-a="follow" data-path={`#${id}`} data-t={at} data-d={duration} data-out={out} data-out-o="0" />
        </g>
      ))}
      <rect className={styles.line} x="12.5" y="49.5" width="46" height="50" rx="6" data-a="draw" data-t=".06" data-d=".18" />
      <path className={styles.type} d="M23 62H43" data-a="draw" data-t=".18" data-d=".06" />
      <path className={`${styles.line} ${styles.thin}`} d="M23 73H48M23 80H42M23 87H46" data-a="draw" data-t=".22" data-d=".08" />
      <rect className={styles.line} x="88.5" y="24.5" width="60" height="38" rx="6" data-a="draw" data-t=".1" data-d=".18" />
      <path className={styles.accent} d="M100 30L101.4 33.6L105 35L101.4 36.4L100 40L98.6 36.4L95 35L98.6 33.6Z" data-a="pop" data-t=".42" />
      <path className={`${styles.line} ${styles.thin}`} d="M111 33H139M111 38H131" data-a="draw" data-t=".24" data-d=".06" />
      <text className={styles.mini} x="96" y="53" data-a="fade" data-t=".44">{copy.organize}</text>
      <rect className={styles.line} x="88.5" y="87.5" width="60" height="38" rx="6" data-a="draw" data-t=".14" data-d=".18" />
      <path className={styles.accent} d="M100 93L101.4 96.6L105 98L101.4 99.4L100 103L98.6 99.4L95 98L98.6 96.6Z" data-a="pop" data-t=".64" />
      <path className={`${styles.line} ${styles.thin}`} d="M111 96H139M111 101H131" data-a="draw" data-t=".28" data-d=".06" />
      <text className={styles.mini} x="96" y="116" data-a="fade" data-t=".66">{copy.prepare}</text>
      <rect className={styles.line} x="178.5" y="49.5" width="49" height="50" rx="6" data-a="draw" data-t=".18" data-d=".18" />
      <path className={styles.type} d="M187 61H208" data-a="draw" data-t=".87" data-d=".04" />
      <path className={`${styles.line} ${styles.thin}`} d="M187 70H219" data-a="draw" data-t=".9" data-d=".03" />
      <path className={`${styles.line} ${styles.thin}`} d="M187 76H213" data-a="draw" data-t=".93" data-d=".03" />
      <rect className={styles.accentLine} x="184" y="83.5" width="38" height="11" rx="5.5" data-a="draw" data-t=".94" data-d=".06" />
      <text className={styles.mini} x="203" y="91.5" textAnchor="middle" data-a="fade" data-t=".98">{copy.review}</text>
    </svg>
  )
}

export { WorkflowScene }
