import styles from "../../sketches/resource-sketch.module.css"

function SharedCaseScene({ label }: { label: string }) {
  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 27.5H240M132.5 0V150" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={styles.line} x="19.5" y="27.5" width="88" height="96" rx="7" data-a="draw" data-t=".06" data-d=".18" />
      <path className={styles.type} d="M32 43H67" data-a="draw" data-t=".24" data-d=".06" />
      <rect className={`${styles.line} ${styles.thin}`} x="32" y="54" width="27" height="28" rx="3" data-a="draw" data-t=".3" data-d=".08" />
      <path className={`${styles.line} ${styles.thin}`} d="M68 58H94M68 65H89M32 94H93M32 102H79" data-a="draw" data-t=".34" data-d=".08" />
      <path className={styles.accentLine} d="M108 76H133M127 70L133 76L127 82" data-a="draw" data-t=".48" data-d=".1" />
      <rect className={styles.line} x="145.5" y="44.5" width="76" height="74" rx="7" data-a="draw" data-t=".58" data-d=".16" />
      <path className={`${styles.line} ${styles.thin}`} d="M157 59H209M157 66H197" data-a="draw" data-t=".72" data-d=".06" />
      <rect className={styles.accentLine} x="154" y="78" width="59" height="27" rx="4" data-a="draw" data-t=".78" data-d=".1" />
      <text className={styles.mini} x="183.5" y="95" textAnchor="middle" data-a="fade" data-t=".9">{label}</text>
    </svg>
  )
}

export { SharedCaseScene }
