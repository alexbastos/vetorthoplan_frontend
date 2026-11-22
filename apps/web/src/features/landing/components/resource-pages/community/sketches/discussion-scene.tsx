import styles from "../../sketches/resource-sketch.module.css"

function DiscussionScene({ label }: { label: string }) {
  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 28.5H240M24.5 0V150" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={styles.line} x="24.5" y="28.5" width="192" height="96" rx="8" data-a="draw" data-t=".06" data-d=".2" />
      <path className={styles.line} d="M24.5 43.5H216.5" data-a="draw" data-t=".22" data-d=".06" />
      <path className={styles.type} d="M37 36H73" data-a="draw" data-t=".28" data-d=".06" />
      <rect className={`${styles.line} ${styles.thin}`} x="37.5" y="53.5" width="111" height="23" rx="7" data-a="draw" data-t=".36" data-d=".1" />
      <path className={`${styles.line} ${styles.thin}`} d="M48 62H134M48 68H113" data-a="draw" data-t=".46" data-d=".06" />
      <rect className={styles.accentLine} x="91.5" y="84.5" width="111" height="25" rx="7" data-a="draw" data-t=".62" data-d=".12" />
      <text className={styles.mini} x="147" y="100" textAnchor="middle" data-a="fade" data-t=".78">{label}</text>
      <circle className={styles.accent} cx="48" cy="98" r="7" data-a="pop" data-t=".88" />
      <path className={styles.check} d="M45 98l2 2 4-4" data-a="draw" data-t=".94" data-d=".06" />
    </svg>
  )
}

export { DiscussionScene }
