import styles from "./landing-light-field.module.css"

const beamPositions = ["one", "two", "three", "four"] as const

function LightBeam({ id }: { id: string }) {
  const blurId = `${id}-blur`
  const fillId = `${id}-fill`
  const edgeId = `${id}-edge`

  return (
    <svg aria-hidden="true" className={styles.streakSvg} fill="none" viewBox="-406.062 -319.206 2176.71 1217.9">
      <g filter={`url(#${blurId})`}>
        <path d="M751.754 729.413L-74.2437 729.284L-82.4098 357.68C-84.4998 262.571 -112.64 169.858 -163.768 89.6336L-350.145 -202.809C-377.857 -245.27 -332.47 -279.678 -252.505 -269.725L906.586 -125.458C947.829 -120.324 984.133 -103.538 1000.74 -81.9317L1716.7 849.516L1369.94 806.347L751.754 729.413Z" fill={`url(#${fillId})`} stroke={`url(#${edgeId})`} strokeWidth="9.905" />
      </g>
      <defs>
        <filter id={blurId} width="2176.71" height="1217.9" x="-406.062" y="-319.206" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="21.4" />
        </filter>
        <linearGradient id={fillId} x1="-385.164" x2="100.645" y1="1480.11" y2="-617.152" gradientUnits="userSpaceOnUse">
          <stop stopColor="#95C5FF" />
          <stop offset="0.62" stopColor="#2C8BFF" />
          <stop offset="0.75" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={edgeId} x1="6.54" x2="-312.01" y1="1279.54" y2="1669.57" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function LandingLightField({ idPrefix, scrollParallax = false }: { idPrefix: string; scrollParallax?: boolean }) {
  return (
    <div aria-hidden="true" className={styles.field} data-scroll-parallax={scrollParallax || undefined}>
      {beamPositions.map((position, index) => (
        <div className={styles.parallax} key={position}>
          <div className={styles.streak}>
            <LightBeam id={`${idPrefix}-${index}`} />
          </div>
        </div>
      ))}
    </div>
  )
}

export { LandingLightField }
