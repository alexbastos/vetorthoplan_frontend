import styles from "../../sketches/resource-sketch.module.css"

function ReportAssistantScene({ draft }: { draft: string }) {
  return (
    <svg aria-hidden="true" className={styles.scene} viewBox="0 0 240 150">
      <path className={styles.guide} d="M0 22.5H240" data-a="draw" data-t="0" data-d=".18" data-out=".6" data-out-o=".14" />
      <path className={styles.guide} d="M20.5 0V150" data-a="draw" data-t=".04" data-d=".18" data-out=".6" data-out-o=".14" />
      <rect className={styles.line} x="20.5" y="22.5" width="98" height="106" rx="6" data-a="draw" data-t=".06" data-d=".18" />
      {[0, 1, 2, 3].map(index => (
        <g key={index}>
          <circle className={styles.soft} cx="31" cy={40 + index * 20} r="3" data-a="pop" data-t={.2 + index * .03} />
          <path className={`${styles.line} ${styles.thin}`} d={`M39 ${37 + index * 20}H82M39 ${43 + index * 20}H70`} data-a="draw" data-t={.22 + index * .03} data-d=".05" />
          <rect className={index === 1 ? styles.accentLine : `${styles.line} ${styles.thin}`} x="88.5" y={35.5 + index * 20} width="22" height="9" rx="4.5" data-a="draw" data-t={.4 + index * .04} data-d=".05" />
        </g>
      ))}
      <rect className={styles.accent} x="88.5" y="55.5" width="22" height="9" rx="4.5" data-a="pop" data-t=".58" />
      <path className={styles.accentLine} d="M112 60C130 60 132 74 146 74" strokeDasharray="2 4" data-a="draw" data-t=".6" data-d=".06" />
      <rect className={styles.line} x="146.5" y="36.5" width="76" height="86" rx="6" data-a="draw" data-t=".5" data-d=".14" />
      <text className={styles.mini} x="154" y="51" data-a="fade" data-t=".6">{draft}</text>
      <path className={`${styles.line} ${styles.thin}`} d="M154 62H212" data-a="draw" data-t=".64" data-d=".03" />
      <path className={`${styles.line} ${styles.thin}`} d="M154 70H206" data-a="draw" data-t=".67" data-d=".03" />
      <path className={`${styles.line} ${styles.thin}`} d="M154 78H210" data-a="draw" data-t=".7" data-d=".03" />
      <path className={`${styles.line} ${styles.thin}`} d="M154 86H190" data-a="draw" data-t=".73" data-d=".03" />
      <g data-a="click" data-t=".88">
        <rect className={styles.ink} x="154.5" y="98.5" width="40" height="15" rx="7.5" data-a="fade" data-t=".8" />
        <path className={styles.check} d="M168 106H181M177 102L181 106L177 110" data-a="draw" data-t=".82" data-d=".04" />
      </g>
    </svg>
  )
}

export { ReportAssistantScene }
