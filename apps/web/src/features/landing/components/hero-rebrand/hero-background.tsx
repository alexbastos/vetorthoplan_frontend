import { useId, type CSSProperties } from "react"

import { heroBackgroundStreaks } from "./hero-background-data"
import { HeroBackgroundMotion } from "./hero-background-motion"
import styles from "./hero-background.module.css"

function HeroBackground() {
  const id = `hero-sky-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

  return (
    <HeroBackgroundMotion>
      <div className={styles.background}>
        <svg aria-hidden="true" className={styles.definitions} focusable="false" height="0" width="0">
          <defs>
            <filter colorInterpolationFilters="sRGB" height="140%" id={`${id}-blur`} width="140%" x="-20%" y="-20%">
              <feGaussianBlur stdDeviation="21.4" />
            </filter>
            {heroBackgroundStreaks.map((streak, index) => (
              <g key={streak.left}>
                <linearGradient gradientUnits="userSpaceOnUse" id={`${id}-fill-${index}`} x1={streak.fillGradient[0]} y1={streak.fillGradient[1]} x2={streak.fillGradient[2]} y2={streak.fillGradient[3]}>
                  <stop stopColor="#95C5FF" />
                  <stop offset="0.62" stopColor="#2C8BFF" />
                  <stop offset="0.75" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <linearGradient gradientUnits="userSpaceOnUse" id={`${id}-light-${index}`} x1={streak.lightGradient[0]} y1={streak.lightGradient[1]} x2={streak.lightGradient[2]} y2={streak.lightGradient[3]}>
                  <stop stopColor="white" stopOpacity="0" />
                  <stop offset="1" stopColor="white" />
                </linearGradient>
                <g id={`${id}-ribbon-${index}`}>
                  <path d={streak.path} fill={`url(#${id}-fill-${index})`} />
                  <path d={streak.path} fill="none" stroke={`url(#${id}-light-${index})`} strokeWidth="9.905" />
                </g>
              </g>
            ))}
          </defs>
        </svg>

        <div className={styles.art}>
          {heroBackgroundStreaks.map((streak, index) => (
            <div
              className={styles.streak}
              key={streak.left}
              style={{
                "--streak-left": streak.left,
                "--streak-top": streak.top,
                "--streak-width": streak.width,
                "--streak-height": streak.height,
                "--from-x": streak.fromX,
                "--from-y": streak.fromY,
                "--drift-x": streak.x,
                "--drift-y": streak.y,
                "--drift-duration": streak.duration,
                "--drift-delay": streak.delay,
                "--drift-direction": streak.direction,
              } as CSSProperties}
            >
              <div className={styles.drift}>
                <svg aria-hidden="true" className={styles.ribbon} focusable="false" preserveAspectRatio="none" viewBox={streak.viewBox}>
                  <g filter={`url(#${id}-blur)`}>
                    <use href={`#${id}-ribbon-${index}`} />
                  </g>
                </svg>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.corner} />
        <div className={styles.veil} />
      </div>
    </HeroBackgroundMotion>
  )
}

export { HeroBackground }
