import styles from "../../sketches/resource-sketch.module.css"

type CaseAssistantCopy = { prompt: string; summary: string }

function CaseAssistantScene({ copy }: { copy: CaseAssistantCopy }) {
  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 32.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M98.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={`${styles.line} ${styles.thin}`} x="10.5" y="18.5" width="220" height="114" rx="8" data-a="draw" data-t=".04" data-d=".18" />
      <path className={styles.type} d="M22 38H70" data-a="draw" data-t=".14" data-d=".06" />
      <path className={`${styles.line} ${styles.thin}`} d="M22 50H84M22 57H76M22 64H80" data-a="draw" data-t=".18" data-d=".06" />
      <rect className={styles.line} x="98.5" y="30.5" width="122" height="94" rx="8" data-a="draw" data-t=".2" data-d=".14" />
      <path className={styles.line} d="M98.5 44.5H220.5" data-a="draw" data-t=".3" data-d=".05" />
      <path className={styles.accent} d="M109 33.5L110.4 36.1L113 37.5L110.4 38.9L109 41.5L107.6 38.9L105 37.5L107.6 36.1Z" data-a="pop" data-t=".32" />
      <rect className={styles.ink} x="122.5" y="52.5" width="92" height="18" rx="9" data-a="fade" data-t=".38" />
      <text className={styles.badge} x="168.5" y="64.5" textAnchor="middle" data-a="fade" data-t=".4">{copy.prompt}</text>
      {[114, 122, 130].map((x, index) => (
        <circle key={x} className={styles.soft} cx={x} cy="86" r="2.4" data-a="pop" data-t={.5 + index * .03} data-out=".64" data-out-o="0" />
      ))}
      <rect className={styles.line} x="104.5" y="77.5" width="90" height="18" rx="9" data-a="draw" data-t=".64" data-d=".08" />
      <text className={styles.mini} x="149.5" y="89.5" textAnchor="middle" data-a="fade" data-t=".7">{copy.summary}</text>
      <path className={styles.accent} d="M205 80L206.8 84.2L211 86L206.8 87.8L205 92L203.2 87.8L199 86L203.2 84.2Z" data-a="pop" data-t=".78" />
      <rect className={`${styles.line} ${styles.thin}`} x="104.5" y="104.5" width="110" height="12" rx="6" data-a="draw" data-t=".4" data-d=".06" />
    </svg>
  )
}

export { CaseAssistantScene }
