import type { LandingPlatformIcon } from "../landing-platform-icons"

import styles from "./routine-benefits-section.module.css"

function RoutineBenefitCard({ icon: Icon, firstLine, secondLine }: {
  icon: LandingPlatformIcon
  firstLine: string
  secondLine: string
}) {
  return (
    <li className={styles.card} data-routine-reveal>
      <span className={styles.icon} aria-hidden="true">
        <Icon width={20} height={20} aria-hidden="true" focusable="false" />
      </span>
      <p className={styles.copy}>
        <span>{firstLine}</span>{" "}<span>{secondLine}</span>
      </p>
    </li>
  )
}

export { RoutineBenefitCard }
