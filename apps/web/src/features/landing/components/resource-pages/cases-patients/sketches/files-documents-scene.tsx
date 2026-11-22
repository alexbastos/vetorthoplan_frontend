"use client"

import { useId } from "react"

import styles from "../../sketches/resource-sketch.module.css"

type FilesDocumentsCopy = { caseLabel: string; image: string; document: string; note: string }

const branches = [
  { id: "image", path: "M116.5 75.5C136 75.5 136 34.5 156.5 34.5", y: 34.5, draw: .46, follow: .54, confirm: .64 },
  { id: "document", path: "M116.5 75.5H156.5", y: 75.5, draw: .48, follow: .59, confirm: .69 },
  { id: "note", path: "M116.5 75.5C136 75.5 136 116.5 156.5 116.5", y: 116.5, draw: .5, follow: .64, confirm: .74 },
] as const

function FilesDocumentsScene({ copy }: { copy: FilesDocumentsCopy }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const prefix = `files-documents-${instance}`
  const lineThin = `${styles.line} ${styles.thin}`

  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 75.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M104.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={styles.line} x="14.5" y="52.5" width="50" height="46" rx="5" data-a="draw" data-t=".08" data-d=".14" />
      <text className={styles.mini} x="22" y="65" data-a="fade" data-t=".18">{copy.caseLabel}</text>
      <path className={lineThin} d="M22 73H48M22 80H52" data-a="draw" data-t=".2" data-d=".06" />
      <rect className={styles.ink} x="22" y="85" width="22" height="7" rx="3.5" data-a="fade" data-t=".24" />
      <path className={lineThin} id={`${prefix}-in`} d="M64.5 75.5H92.5" data-a="draw" data-t=".28" data-d=".06" />
      <circle className={styles.accent} cx="0" cy="0" r="3" data-a="follow" data-path={`#${prefix}-in`} data-t=".32" data-d=".06" data-out=".4" data-out-o="0" />
      <circle className={styles.line} cx="104.5" cy="75.5" r="12" transform="rotate(-90 104.5 75.5)" data-a="draw" data-t=".34" data-d=".1" />
      <path className={styles.accentLine} d="M100.5 75.5H108.5M104.5 71.5V79.5" data-a="draw" data-t=".42" data-d=".06" />
      {branches.map((branch, index) => (
        <g key={branch.id}>
          <path className={lineThin} id={`${prefix}-${branch.id}`} d={branch.path} data-a="draw" data-t={branch.draw} data-d=".08" />
          <circle className={styles.accent} cx="0" cy="0" r="3" data-a="follow" data-path={`#${prefix}-${branch.id}`}
            data-t={branch.follow} data-d=".08" data-out={branch.follow + .12} data-out-o="0" />
          <rect className={styles.line} x="156.5" y={branch.y - 13} width="58" height="26" rx="5"
            data-a="draw" data-t={.48 + index * .02} data-d=".1" />
          <circle className={styles.accent} cx="214.5" cy={branch.y} r="6.5" data-a="pop" data-t={branch.confirm} />
          <path className={styles.check} d={`M211.25 ${branch.y}l2.34 2.34l4.16 -4.68`}
            data-a="draw" data-t={branch.confirm + .04} data-d=".05" />
        </g>
      ))}
      <path className={lineThin} d="M164 28.5H182V40.5H164ZM166 38L170 34L174 38L176 36L180 40"
        data-a="draw" data-t=".6" data-d=".06" />
      <circle className={styles.accent} cx="178" cy="31.5" r="1.3" data-a="pop" data-t=".62" />
      <text className={styles.mini} x="186" y="38.5" data-a="fade" data-t=".62">{copy.image}</text>
      <path className={lineThin} d="M164 68.5H175L179 72.5V82.5H164ZM175 68.5V72.5H179"
        data-a="draw" data-t=".62" data-d=".06" />
      <text className={styles.mini} x="185" y="79" data-a="fade" data-t=".66">{copy.document}</text>
      <path className={lineThin} d="M164 109.5H180V123.5H164ZM168 114H176M168 118H174"
        data-a="draw" data-t=".64" data-d=".06" />
      <text className={styles.mini} x="185" y="120" data-a="fade" data-t=".68">{copy.note}</text>
    </svg>
  )
}

export { FilesDocumentsScene }
