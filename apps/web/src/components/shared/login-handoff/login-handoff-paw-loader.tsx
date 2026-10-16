"use client"

import { useEffect, useRef, type CSSProperties } from "react"

import styles from "./login-handoff-paw-loader.module.css"

const ORBIT_DURATION = 800
const LOCK_HOLD = 80
const CLICK_DURATION = 250
const SETTLED_HOLD = 125
const EXIT_HOLD = 150
const ORBIT_CENTER = { x: 24.717912, y: 35.790787 } as const
const VIEWBOX = { height: 64, width: 64, x: -7.282088452, y: 3.790786584 } as const
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

type PawAnimationPhase = "clicking" | "idle" | "locked" | "orbiting" | "settled"

type PawAnimationController = {
  requestSettle: () => void
}

type LoginHandoffPawLoaderProps = {
  onSettled?: () => void
  settle?: boolean
  size?: number
}

function LoginHandoffPawLoader({
  onSettled,
  settle = false,
  size = 104,
}: LoginHandoffPawLoaderProps) {
  const symbolRef = useRef<SVGSVGElement>(null)
  const mainPadRef = useRef<SVGPathElement>(null)
  const toesOrbitRef = useRef<SVGGElement>(null)
  const toeOrientationRefs = useRef<Array<SVGGElement | null>>([])
  const controllerRef = useRef<PawAnimationController | null>(null)
  const onSettledRef = useRef(onSettled)

  useEffect(() => {
    onSettledRef.current = onSettled
  }, [onSettled])

  useEffect(() => {
    const symbol = symbolRef.current
    const mainPad = mainPadRef.current
    const toesOrbit = toesOrbitRef.current
    const toeOrientations = toeOrientationRefs.current.filter(
      (toe): toe is SVGGElement => toe !== null,
    )

    if (!symbol || !mainPad || !toesOrbit || toeOrientations.length !== 4) {
      return undefined
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let activeAnimations: Animation[] = []
    let destroyed = false
    let exitStarted = false
    let phase: PawAnimationPhase = "idle"
    let settleRequested = false
    let settledNotified = false

    const cancelActiveAnimations = () => {
      activeAnimations.forEach((animation) => animation.cancel())
      activeAnimations = []
    }

    const playPhase = async (nextPhase: PawAnimationPhase, animations: Animation[]) => {
      if (destroyed) {
        animations.forEach((animation) => animation.cancel())
        return false
      }

      phase = nextPhase
      activeAnimations = animations

      await Promise.all(animations.map((animation) => animation.ready))
      if (destroyed) {
        animations.forEach((animation) => animation.cancel())
        return false
      }

      const sharedStartTime = document.timeline.currentTime
      animations.forEach((animation) => {
        animation.startTime = sharedStartTime
      })

      const completed = await Promise.all(
        animations.map((animation) => animation.finished.then(() => true).catch(() => false)),
      )

      if (destroyed || completed.some((result) => !result)) {
        return false
      }

      animations.forEach((animation) => animation.cancel())
      if (activeAnimations === animations) {
        activeAnimations = []
      }

      return true
    }

    const createHoldAnimation = (duration: number) => symbol.animate(
      [{ opacity: 1 }, { opacity: 1 }],
      { duration, fill: "both" },
    )

    const createOrbitAnimations = () => {
      const options: KeyframeAnimationOptions = {
        duration: ORBIT_DURATION,
        easing: "linear",
        fill: "both",
      }

      return [
        toesOrbit.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
          options,
        ),
        ...toeOrientations.map((toe) => toe.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(-360deg)" }],
          options,
        )),
      ]
    }

    const createClickAnimation = () => mainPad.animate(
      [
        { easing: EASE, offset: 0, transform: "translateY(0) scale(1)" },
        { easing: EASE, offset: 0.36, transform: "translateY(-3px) scale(1.02)" },
        {
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          offset: 0.72,
          transform: "translateY(0) scaleX(1.03) scaleY(0.94)",
        },
        { easing: EASE, offset: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: CLICK_DURATION, fill: "both" },
    )

    const finishAtOriginalPaw = async () => {
      if (exitStarted || destroyed) return

      exitStarted = true
      const held = await playPhase("settled", [createHoldAnimation(EXIT_HOLD)])

      if (held && !destroyed && !settledNotified) {
        settledNotified = true
        onSettledRef.current?.()
      }
    }

    const runChoreography = async () => {
      while (!destroyed && !reducedMotion) {
        if (!await playPhase("orbiting", createOrbitAnimations())) return
        if (settleRequested) return finishAtOriginalPaw()

        if (!await playPhase("locked", [createHoldAnimation(LOCK_HOLD)])) return
        if (settleRequested) return finishAtOriginalPaw()

        if (!await playPhase("clicking", [createClickAnimation()])) return
        if (settleRequested) return finishAtOriginalPaw()

        if (!await playPhase("settled", [createHoldAnimation(SETTLED_HOLD)])) return
        if (settleRequested) return finishAtOriginalPaw()
      }
    }

    controllerRef.current = {
      requestSettle: () => {
        if (settleRequested) return

        settleRequested = true
        if (reducedMotion || phase === "idle") {
          void finishAtOriginalPaw()
        }
      },
    }

    if (!reducedMotion) {
      void runChoreography()
    }

    return () => {
      destroyed = true
      controllerRef.current = null
      cancelActiveAnimations()
    }
  }, [])

  useEffect(() => {
    if (settle) {
      controllerRef.current?.requestSettle()
    }
  }, [settle])

  return (
    <span
      aria-hidden="true"
      className={styles.loader}
      style={{ "--orthovet-paw-loader-size": `${size}px` } as CSSProperties}
    >
      <svg
        ref={symbolRef}
        className={styles.symbol}
        preserveAspectRatio="xMidYMid meet"
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          ref={mainPadRef}
          className={styles.mainPad}
          d="m37.7 38.82c0 2.8-2.61 4.53-5.35 4.53-2.39-0.06-4.4-1.28-7.57-1.28-3.4 0.05-5.48 1.34-7.8 1.34-2.99 0-5.32-1.91-5.32-4.56 0.03-2.15 1.42-4.69 3.46-6.76 3.04-3.18 6.47-6.22 9.66-6.22 3.4 0 6.51 3 9.6 6.22 2.05 2.15 3.34 4.46 3.32 6.73z"
          fill="#050505"
        />
        <g
          ref={toesOrbitRef}
          className={styles.toesOrbit}
          style={{ transformOrigin: toViewBoxOrigin(ORBIT_CENTER.x, ORBIT_CENTER.y) }}
        >
          <g
            ref={(node) => { toeOrientationRefs.current[0] = node }}
            className={styles.toeOrientation}
            style={{ transformOrigin: toViewBoxOrigin(6.108, 24.75) }}
          >
            <ellipse transform="rotate(-19.21 6.108 24.75)" cx="6.108" cy="24.75" rx="4.944" ry="7.544" fill="#050505" />
          </g>
          <g
            ref={(node) => { toeOrientationRefs.current[1] = node }}
            className={styles.toeOrientation}
            style={{ transformOrigin: toViewBoxOrigin(17.41, 15.22) }}
          >
            <ellipse cx="17.41" cy="15.22" rx="5.786" ry="8.399" fill="#050505" />
          </g>
          <g
            ref={(node) => { toeOrientationRefs.current[2] = node }}
            className={styles.toeOrientation}
            style={{ transformOrigin: toViewBoxOrigin(32.71, 15.2) }}
          >
            <ellipse cx="32.71" cy="15.2" rx="5.786" ry="8.364" fill="#050505" />
          </g>
          <g
            ref={(node) => { toeOrientationRefs.current[3] = node }}
            className={styles.toeOrientation}
            style={{ transformOrigin: toViewBoxOrigin(43.83, 24.75) }}
          >
            <ellipse transform="rotate(23.14 43.83 24.75)" cx="43.83" cy="24.75" rx="4.694" ry="7.544" fill="#050505" />
          </g>
        </g>
      </svg>
    </span>
  )
}

function toViewBoxOrigin(x: number, y: number) {
  return `${((x - VIEWBOX.x) / VIEWBOX.width) * 100}% ${((y - VIEWBOX.y) / VIEWBOX.height) * 100}%`
}

export { LoginHandoffPawLoader }
export type { LoginHandoffPawLoaderProps }
