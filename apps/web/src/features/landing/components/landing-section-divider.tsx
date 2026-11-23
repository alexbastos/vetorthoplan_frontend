import styles from "./landing-section-divider.module.css"

function LandingSectionDivider({ dots = true, className }: { dots?: boolean; className?: string } = {}) {
  return (
    <div aria-hidden="true" className={`${styles.boundary}${className ? ` ${className}` : ""}`}>
      <div className={styles.inner}>
        {dots ? (
          <>
            <span className={`${styles.dot} ${styles.left}`} />
            <span className={`${styles.dot} ${styles.right}`} />
          </>
        ) : null}
      </div>
    </div>
  )
}

export { LandingSectionDivider }
