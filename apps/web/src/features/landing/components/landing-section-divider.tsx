import styles from "./landing-section-divider.module.css"

function LandingSectionDivider({ dots = true }: { dots?: boolean } = {}) {
  return (
    <div aria-hidden="true" className={styles.boundary}>
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
