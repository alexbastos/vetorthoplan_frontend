import styles from "./closing-cta.module.css"

const visualColumns = Array.from({ length: 64 }, (_, index) => {
  const progress = index / 63
  const height = Math.round(12 + progress * 90 + Math.abs(Math.sin(index * 0.63)) * 48)
  const center = 270 - progress * 90 - Math.sin(index * 0.2) * 40

  return {
    x: index * 16,
    y: Math.round(center - height / 2),
    height,
    opacity: 0.35 + (index % 5) * 0.15,
    accent: index % 9 === 4,
  }
})

function ClosingCtaFallback({ hidden }: { hidden: boolean }) {
  return (
    <div className={`${styles.visualLayer} ${styles.visualFallback} ${hidden ? styles.visualFallbackHidden : ""}`}>
      <svg
        aria-hidden="true"
        className="block h-full w-full"
        focusable="false"
        width="100%"
        height="100%"
        viewBox="0 0 1024 360"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {visualColumns.map(({ x, y, height, opacity, accent }) => (
          <g key={x} opacity={opacity}>
            <path
              d={`M ${x + 5} ${y - 18} V ${y + height + 160}`}
              stroke="var(--closing-cta-visual-secondary)"
              strokeWidth="1"
              opacity="0.6"
            />
            <rect x={x} y={y} width="10" height={height} rx="2" fill="var(--closing-cta-visual-primary)" />
            <rect
              x={x}
              y={y + height + 14}
              width="10"
              height={height + 75}
              rx="2"
              fill="var(--closing-cta-visual-secondary)"
              opacity="0.65"
            />
            {accent ? (
              <rect x={x + 1} y={y - 22} width="8" height="14" rx="1" fill="var(--closing-cta-visual-accent)" />
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  )
}

export { ClosingCtaFallback }
