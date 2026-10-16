"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useId, useRef, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

import styles from "./vetorthoplan-loader.module.css"

gsap.registerPlugin(useGSAP)

const VIEWBOX = {
  height: 13.697908973693847,
  width: 9.997915840148925,
  x: 42.86877889633179,
  y: 33.15538473129273,
} as const

const VIEWBOX_BOTTOM = VIEWBOX.y + VIEWBOX.height
const JOINT_ORIGIN = "47.65 40.48"

export interface OrthoVetLoaderProps {
  className?: string
  onSettled?: () => void
  settle?: boolean
  size?: number
}

export function OrthoVetLoader({
  className,
  onSettled,
  settle = false,
  size = 88,
}: OrthoVetLoaderProps) {
  const instanceId = useId().replaceAll(":", "")
  const containerRef = useRef<HTMLSpanElement>(null)
  const sceneRef = useRef<SVGGElement>(null)
  const upperBoneRef = useRef<SVGGElement>(null)
  const lowerBoneRef = useRef<SVGGElement>(null)
  const jointRef = useRef<SVGGElement>(null)
  const arcClipRectRef = useRef<SVGRectElement>(null)
  const tickRefs = useRef<Array<SVGPathElement | null>>([])
  const loopTimelineRef = useRef<gsap.core.Timeline | null>(null)

  const lowerGradientId = `${instanceId}-orthovet-lower-bone`
  const upperGradientId = `${instanceId}-orthovet-upper-bone`
  const jointGradientId = `${instanceId}-orthovet-joint`
  const arcClipId = `${instanceId}-orthovet-arc-clip`
  const viewBoxUnitsPerPixel = VIEWBOX.height / size
  const approachX = 6 * viewBoxUnitsPerPixel
  const approachY = 7 * viewBoxUnitsPerPixel
  const snapX = viewBoxUnitsPerPixel

  useGSAP(
    () => {
      const scene = sceneRef.current
      const upperBone = upperBoneRef.current
      const lowerBone = lowerBoneRef.current
      const joint = jointRef.current
      const arcClipRect = arcClipRectRef.current
      const ticks = tickRefs.current.filter(
        (tick): tick is SVGPathElement => tick !== null,
      )

      if (!scene || !upperBone || !lowerBone || !joint || !arcClipRect) {
        return
      }

      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const orderedTicks = [...ticks].reverse()
        const timeline = gsap.timeline({ repeat: -1 })
        loopTimelineRef.current = timeline

        const resetWhileHidden = () => {
          gsap.set(scene, { autoAlpha: 0 })
          gsap.set(upperBone, { autoAlpha: 0, rotation: 0, x: approachX, y: -approachY })
          gsap.set(lowerBone, { autoAlpha: 0, rotation: 0, x: -approachX, y: approachY })
          gsap.set(joint, { autoAlpha: 0, x: 0, y: 0 })
          gsap.set(arcClipRect, {
            attr: { height: 0, y: VIEWBOX_BOTTOM },
          })
          gsap.set(ticks, { autoAlpha: 0, scale: 0.96 })
        }

        resetWhileHidden()

        timeline
          .call(resetWhileHidden, [], 0)
          .to(scene, { autoAlpha: 1, duration: 0.12, ease: "power1.out" }, 0.04)
          .to(
            upperBone,
            {
              autoAlpha: 1,
              duration: 0.58,
              ease: "power3.out",
              x: 0,
              y: 0,
            },
            0.1,
          )
          .to(
            lowerBone,
            {
              autoAlpha: 1,
              duration: 0.58,
              ease: "power3.out",
              x: 0,
              y: 0,
            },
            0.1,
          )
          .to(
            [upperBone, lowerBone, joint],
            {
              duration: 0.06,
              ease: "power1.out",
              x: -snapX,
              y: 0,
            },
            0.68,
          )
          .to(
            [upperBone, lowerBone, joint],
            {
              duration: 0.06,
              ease: "power1.out",
              x: 0,
              y: 0,
            },
            0.74,
          )
          .to(joint, { autoAlpha: 1, duration: 0.24, ease: "power2.out" }, 0.44)
          .to(
            arcClipRect,
            {
              attr: { height: VIEWBOX.height, y: VIEWBOX.y },
              duration: 0.48,
              ease: "power3.out",
            },
            0.92,
          )
          .to(
            orderedTicks,
            {
              autoAlpha: 1,
              duration: 0.14,
              ease: "power2.out",
              scale: 1,
              stagger: 0.03,
            },
            1.16,
          )
          .to(
            upperBone,
            {
              duration: 0.11,
              ease: "power1.inOut",
              rotation: 1,
              svgOrigin: JOINT_ORIGIN,
            },
            1.57,
          )
          .to(
            lowerBone,
            {
              duration: 0.11,
              ease: "power1.inOut",
              rotation: -0.75,
              svgOrigin: JOINT_ORIGIN,
            },
            1.57,
          )
          .to(
            [upperBone, lowerBone],
            {
              duration: 0.12,
              ease: "power1.inOut",
              rotation: 0,
              svgOrigin: JOINT_ORIGIN,
            },
            1.68,
          )
          .to(scene, { autoAlpha: 0, duration: 0.24, ease: "power1.in" }, 2.2)
          .call(resetWhileHidden, [], 2.44)
          .to({}, { duration: 0.26 }, 2.44)

        return () => {
          if (loopTimelineRef.current === timeline) {
            loopTimelineRef.current = null
          }
          timeline.kill()
        }
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(scene, { autoAlpha: 1 })
        gsap.set([upperBone, lowerBone], {
          autoAlpha: 1,
          clearProps: "transform",
        })
        gsap.set([joint, ...ticks], { autoAlpha: 1, clearProps: "transform" })
        gsap.set(arcClipRect, {
          attr: { height: VIEWBOX.height, y: VIEWBOX.y },
        })
      })

      return () => media.revert()
    },
    {
      dependencies: [size],
      revertOnUpdate: true,
      scope: containerRef,
    },
  )

  useGSAP(
    () => {
      if (!settle) {
        return undefined
      }

      const scene = sceneRef.current
      const upperBone = upperBoneRef.current
      const lowerBone = lowerBoneRef.current
      const joint = jointRef.current
      const arcClipRect = arcClipRectRef.current
      const ticks = tickRefs.current.filter(
        (tick): tick is SVGPathElement => tick !== null,
      )

      if (!scene || !upperBone || !lowerBone || !joint || !arcClipRect) {
        return undefined
      }

      loopTimelineRef.current?.pause()
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const settleTimeline = gsap.timeline({ onComplete: onSettled })

        settleTimeline
          .to(scene, { autoAlpha: 1, duration: 0.18, ease: "power2.out" }, 0)
          .to(
            [upperBone, lowerBone],
            {
              autoAlpha: 1,
              duration: 0.18,
              ease: "power2.out",
              rotation: 0,
              x: 0,
              y: 0,
            },
            0,
          )
          .to(joint, { autoAlpha: 1, duration: 0.18, ease: "power2.out", x: 0, y: 0 }, 0)
          .to(
            arcClipRect,
            {
              attr: { height: VIEWBOX.height, y: VIEWBOX.y },
              duration: 0.18,
              ease: "power2.out",
            },
            0,
          )
          .to(ticks, { autoAlpha: 1, duration: 0.18, ease: "power2.out", scale: 1 }, 0)

        return () => settleTimeline.kill()
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(scene, { autoAlpha: 1 })
        gsap.set([upperBone, lowerBone], { autoAlpha: 1, rotation: 0, x: 0, y: 0 })
        gsap.set(joint, { autoAlpha: 1, x: 0, y: 0 })
        gsap.set(arcClipRect, { attr: { height: VIEWBOX.height, y: VIEWBOX.y } })
        gsap.set(ticks, { autoAlpha: 1, scale: 1 })
        onSettled?.()
      })

      return () => media.revert()
    },
    {
      dependencies: [onSettled, settle],
      revertOnUpdate: true,
      scope: containerRef,
    },
  )

  return (
    <span
      ref={containerRef}
      aria-label="Carregando"
      aria-live="polite"
      className={cn(styles.loader, className)}
      role="status"
      style={{ "--orthovet-loader-size": `${size}px` } as CSSProperties}
    >
      <svg
        aria-hidden="true"
        className={styles.symbol}
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={lowerGradientId} x1="45.06" x2="48.45" y1="40.34" y2="43.85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5F0EC" offset="0" />
            <stop stopColor="#EAE2DD" offset=".2588" />
            <stop stopColor="#A19690" offset=".549" />
            <stop stopColor="#726A67" offset=".8118" />
            <stop stopColor="#544E4D" offset="1" />
          </linearGradient>
          <linearGradient id={upperGradientId} x1="47.03" x2="49.7" y1="33.9" y2="40.51" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5F0EC" offset="0" />
            <stop stopColor="#D6CEC9" offset=".2196" />
            <stop stopColor="#F7F3F0" offset=".5098" />
            <stop stopColor="#C1B7B2" offset=".7412" />
            <stop stopColor="#837A76" offset="1" />
          </linearGradient>
          <linearGradient id={jointGradientId} x1="46.45" x2="48.06" y1="39.07" y2="40.44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#131414" offset="0" />
            <stop stopColor="#454545" offset=".4902" />
            <stop stopColor="#0D0D0D" offset="1" />
          </linearGradient>
          <clipPath id={arcClipId}>
            <rect ref={arcClipRectRef} height={VIEWBOX.height} width={VIEWBOX.width} x={VIEWBOX.x} y={VIEWBOX.y} />
          </clipPath>
        </defs>

        <g ref={sceneRef} className={styles.scene}>
          <g clipPath={`url(#${arcClipId})`}>
            <path fill="#3D4042" d="m51.25 36.54c-0.03-0.03-0.07 0.01-0.05 0.04 0.57 0.83 0.89 1.83 0.85 2.91-0.08 2.49-1.96 4.29-3.95 4.92-0.06 0.02-0.03 0.1 0.03 0.09 2.51-0.51 4.36-2.32 4.41-4.81 0.02-1.28-0.5-2.38-1.29-3.15z" />
          </g>

          <g className={styles.ticks}>
            <path ref={(node) => { tickRefs.current[0] = node }} fill="#232526" d="m51.8 39.32-0.24-0.03c-0.03-0.01-0.06 0.01-0.06 0.04-0.01 0.03 0.01 0.06 0.04 0.07l0.24 0.03c0.03 0.01 0.06-0.01 0.06-0.04 0.01-0.04-0.01-0.06-0.04-0.07z" />
            <path ref={(node) => { tickRefs.current[1] = node }} fill="#232526" d="m51.74 39.87-0.25-0.06c-0.03-0.01-0.05 0.01-0.06 0.04s0.01 0.06 0.04 0.07l0.24 0.06c0.03 0.01 0.06-0.01 0.07-0.04s-0.01-0.06-0.04-0.07z" />
            <path ref={(node) => { tickRefs.current[2] = node }} fill="#232526" d="m51.61 40.41-0.24-0.07c-0.03-0.01-0.06 0.01-0.07 0.04s0.01 0.06 0.04 0.07l0.23 0.07c0.03 0.01 0.06-0.01 0.07-0.03 0.02-0.04 0-0.07-0.03-0.08z" />
            <path ref={(node) => { tickRefs.current[3] = node }} fill="#232526" d="m51.44 40.94-0.23-0.08c-0.03-0.01-0.06 0.01-0.07 0.03-0.01 0.03 0 0.06 0.03 0.08l0.23 0.08c0.03 0.01 0.06 0 0.07-0.03 0.02-0.03 0-0.06-0.03-0.08z" />
            <path ref={(node) => { tickRefs.current[4] = node }} fill="#232526" d="m51.23 41.44-0.22-0.08c-0.03-0.01-0.06 0-0.07 0.03s0.01 0.06 0.04 0.08l0.22 0.08c0.03 0.01 0.06 0 0.07-0.03s-0.01-0.06-0.04-0.08z" />
            <path ref={(node) => { tickRefs.current[5] = node }} fill="#232526" d="m51.04 41.91-0.22-0.07c-0.03-0.01-0.06 0-0.07 0.03s0.01 0.06 0.04 0.08l0.22 0.07c0.03 0.01 0.06 0 0.07-0.03s-0.01-0.06-0.04-0.08z" />
          </g>

          <g ref={lowerBoneRef} className={styles.motionPart}>
            <path fill={`url(#${lowerGradientId})`} d="m49.55 40.77c-0.13-0.07-0.27-0.12-0.41-0.17l-0.15-0.03c-0.46-0.11-0.92-0.11-1.47-0.06-0.67 0.07-1.01-0.16-1.49-0.51-0.46-0.35-0.99-0.6-1.64-0.61-0.74 0.11-1.02 0.54-0.95 1.03 0.07 0.56 0.71 1.02 0.73 2.07 0.03 1.3-0.76 2.72-0.97 3.06-0.13 0.26 2.28 1.24 2.47 0.91 0.44-1.44 1.54-3.25 2.98-3.67 1.13-0.33 1.28-1.6 0.9-2.02z" />
            <path fill="#FEFCFB" opacity=".5" d="m44.04 45.88c0.65-1.33 0.99-2.72 0.84-3.84-0.1-0.86-0.94-1.34-0.69-2.39-0.51 0.09-0.75 0.33-0.73 0.76 0.04 0.55 0.71 1.02 0.73 2.08 0.03 1.28-0.7 2.66-0.92 3.06 0.04 0.13 0.43 0.3 0.77 0.33z" />
            <path fill="#726A67" opacity=".5" d="m49.18 41.28c-0.88 0.25-2.1 0.42-2.87 1.49-0.76 1.08-1.32 2.43-1.72 3.29 0.4 0.2 0.91 0.39 1.08 0.37 0.45-1.45 1.57-3.26 3-3.69 0.64-0.3 0.73-0.99 0.51-1.46z" />
          </g>

          <g ref={upperBoneRef} className={styles.motionPart}>
            <path fill={`url(#${upperGradientId})`} d="m50.78 38.16c-0.84-1.22-0.62-3.02-0.22-3.8 0.1-0.31-2.21-1.03-2.4-0.85-0.34 1.29-1.01 2.75-2.83 3.31-0.86 0.27-1.15 0.77-1.06 1.26 0.07 0.43 0.39 0.81 0.82 1.01 0.4 0.15 0.78 0.35 1.15 0.64 0.49 0.4 0.96 0.66 1.59 0.68 0.46 0.07 0.92 0.15 1.39 0.14 1.46 0 1.96-1.62 1.56-2.39z" />
            <path fill="#FEFCFB" opacity=".5" d="m48.78 33.53c-0.29 1.44-1.24 3.13-2.9 3.61-0.96 0.22-1.31 0.62-1.26 1.3-0.21-0.15-0.3-0.37-0.3-0.62 0.01-0.43 0.36-0.77 1.05-0.97 1.82-0.51 2.52-2.03 2.85-3.33 0.16-0.02 0.35-0.02 0.56 0.01z" />
            <path fill="#726A67" opacity=".5" d="m50.56 38.74c-0.06-0.18-0.25-0.36-0.43-0.6-0.85-1.15-0.41-2.99 0.1-3.82-0.09-0.07-0.28-0.15-0.51-0.23-0.57 0.98-0.83 2.24-0.4 3.27 0.17 0.44 0.53 0.81 0.57 1.23 0.06 0.74-0.57 1.16-1.22 0.99-0.52-0.13-0.92-0.82-1.65-1.14-0.88-0.38-1.82 0.36-2.46 0 0.11 0.19 0.3 0.42 0.56 0.59 0.39 0.19 0.82 0.34 1.22 0.66 0.46 0.38 0.91 0.64 1.5 0.68 0.46 0.08 0.92 0.16 1.37 0.15 1.27-0.1 1.58-1.1 1.35-1.78z" />
          </g>

          <g ref={jointRef}>
            <path fill={`url(#${jointGradientId})`} d="m49.08 40.5c-0.71-0.27-1.01-0.99-1.89-1.32-0.81-0.3-1.8 0.22-2.67-0.15-0.03-0.02-0.05 0.03-0.02 0.05 0.37 0.22 0.88 0.37 1.35 0.74 0.52 0.43 1 0.72 1.74 0.62 0.6-0.07 1.09 0.07 1.49 0.14 0.04 0.01 0.04-0.06 0-0.08z" />
            <path fill="#161616" d="m49.04 40.48c-0.44-0.09-0.95-0.13-1.51-0.05-0.71 0.1-1.17-0.2-1.68-0.6-0.42-0.32-0.89-0.47-1.25-0.64-0.03-0.02-0.05-0.03-0.08-0.05s-0.04 0.02-0.01 0.04c0.36 0.22 0.85 0.35 1.31 0.75 0.51 0.45 0.99 0.73 1.73 0.64 0.6-0.06 1.1 0.02 1.52 0.08 0.05-0.01 0.02-0.15-0.03-0.17z" />
          </g>
        </g>
      </svg>
    </span>
  )
}

// Mantém compatibilidade durante a adoção do nome público mais específico.
export const VetorthoplanLoader = OrthoVetLoader
export type VetorthoplanLoaderProps = OrthoVetLoaderProps
