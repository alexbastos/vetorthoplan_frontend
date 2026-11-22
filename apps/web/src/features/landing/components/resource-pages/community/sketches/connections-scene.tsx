import styles from "../../sketches/resource-sketch.module.css"

function ConnectionsScene({ label }: { label: string }) {
  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 34.5H240M120.5 0V150" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={styles.line} x="20.5" y="34.5" width="80" height="85" rx="7" data-a="draw" data-t=".06" data-d=".18" />
      <circle className={`${styles.line} ${styles.thin}`} cx="43" cy="57" r="10" data-a="draw" data-t=".24" data-d=".08" />
      <path className={styles.type} d="M61 53H88" data-a="draw" data-t=".3" data-d=".06" />
      <path className={`${styles.line} ${styles.thin}`} d="M61 62H81M33 79H87M33 87H76" data-a="draw" data-t=".34" data-d=".08" />
      <rect className={styles.accentLine} x="33" y="99" width="49" height="12" rx="6" data-a="draw" data-t=".46" data-d=".08" />
      <path className={styles.accentLine} d="M101 77C121 77 120 70 140 70" data-a="draw" data-t=".56" data-d=".12" />
      <rect className={styles.line} x="140.5" y="43.5" width="79" height="72" rx="7" data-a="draw" data-t=".6" data-d=".16" />
      <path className={styles.type} d="M152 57H192" data-a="draw" data-t=".72" data-d=".06" />
      <path className={`${styles.line} ${styles.thin}`} d="M152 69H207M152 76H193" data-a="draw" data-t=".76" data-d=".06" />
      <rect className={styles.accentLine} x="150" y="88" width="60" height="17" rx="8.5" data-a="draw" data-t=".84" data-d=".08" />
      <text className={styles.mini} x="180" y="99" textAnchor="middle" data-a="fade" data-t=".92">{label}</text>
    </svg>
  )
}

export { ConnectionsScene }
