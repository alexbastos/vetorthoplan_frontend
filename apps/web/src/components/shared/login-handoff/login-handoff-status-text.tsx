import { ShimmerText } from "@/components/ui/shimmer-text"

import styles from "./login-handoff-overlay.module.css"

function LoginHandoffStatusText({ children }: { children: string }) {
  return <>
    <ShimmerText className={styles.statusLabel}>{children.replace(/(?:\.{3}|…)[\s]*$/u, "")}</ShimmerText>
    <svg aria-hidden="true" className={styles.statusDots} fill="none" viewBox="0 0 18 6" xmlns="http://www.w3.org/2000/svg">
      <circle className={styles.statusDot} cx="3" cy="3" r="1.25" />
      <circle className={styles.statusDot} cx="9" cy="3" r="1.25" />
      <circle className={styles.statusDot} cx="15" cy="3" r="1.25" />
    </svg>
  </>
}

export { LoginHandoffStatusText }
