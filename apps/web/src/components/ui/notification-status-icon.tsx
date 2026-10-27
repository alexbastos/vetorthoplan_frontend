import type { SVGProps } from "react"

import styles from "./sonner.module.css"

type NotificationKind = "success" | "warning" | "error" | "info"

const colorClasses = {
  success: styles.iconSuccess,
  warning: styles.iconWarning,
  error: styles.iconError,
  info: styles.iconInfo,
}

function NotificationStatusIcon({ kind, className = "", ...props }: SVGProps<SVGSVGElement> & { kind: NotificationKind }) {
  return (
    <svg aria-hidden="true" className={`${styles.statusIcon} ${colorClasses[kind]} ${className}`} viewBox="0 0 24 24" {...props}>
      {kind === "warning" ? (
        <path d="M10.27 3.97a2 2 0 0 1 3.46 0l8 13.86a2 2 0 0 1-1.73 3H4a2 2 0 0 1-1.73-3Z" fill="currentColor" />
      ) : <circle cx="12" cy="12" r="10" fill="currentColor" />}
      <g className={styles.iconMark} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
        {kind === "success" ? <path d="m7.5 12 3 3 6-6" /> : null}
        {kind === "error" ? <path d="m8.5 8.5 7 7m0-7-7 7" /> : null}
        {kind === "info" ? <path d="M12 11v5" /> : null}
        {kind === "warning" ? <path d="M12 9v4" /> : null}
      </g>
      {kind === "info" || kind === "warning" ? <circle className={styles.iconMark} cx="12" cy={kind === "info" ? "7.5" : "17"} r="1.2" fill="currentColor" /> : null}
    </svg>
  )
}

export { NotificationStatusIcon }
export type { NotificationKind }
