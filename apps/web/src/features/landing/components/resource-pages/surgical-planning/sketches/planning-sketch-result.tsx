import styles from "../../sketches/resource-sketch.module.css"

function PlanningSketchResult({ value, y, at = .82, width = 52 }: { value: string; y: number; at?: number; width?: number }) {
  const x = 195.5 - width

  return (
    <>
      <g data-a="slide" data-sx="-4" data-t={at} data-d=".08">
        <rect className={styles.paper} x={x} y={y} width={width} height="18" rx="9" />
        <rect className={styles.accentLine} x={x} y={y} width={width} height="18" rx="9" />
        <text className={styles.mini} textAnchor="middle" x={x + width / 2} y={y + 11.7}>{value}</text>
      </g>
      <circle className={styles.accent} cx="207.5" cy={y + 9} r="6" data-a="pop" data-t={at + .08} data-d=".05" />
      <path className={styles.check} d={`M204.5 ${y + 9}l2.16 2.16l3.84 -4.32`}
        data-a="draw" data-t={at + .12} data-d=".04" />
    </>
  )
}

export { PlanningSketchResult }
