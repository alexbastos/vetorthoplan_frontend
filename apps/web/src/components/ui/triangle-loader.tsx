"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useRef } from "react"
import { cn } from "@/lib/utils"

gsap.registerPlugin(useGSAP)

export interface TriangleLoaderProps {
  className?: string
  size?: number
  color?: string
}

export function TriangleLoader({
  className,
  size = 64,
  color = "currentColor",
}: TriangleLoaderProps) {
  const containerRef = useRef<SVGSVGElement | null>(null)
  const circleTopRef = useRef<SVGCircleElement | null>(null)
  const circleRightRef = useRef<SVGCircleElement | null>(null)
  const circleLeftRef = useRef<SVGCircleElement | null>(null)
  const groupRef = useRef<SVGGElement | null>(null)

  useGSAP(
    () => {
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const cTop = circleTopRef.current
        const cRight = circleRightRef.current
        const cLeft = circleLeftRef.current
        const group = groupRef.current

        if (!cTop || !cRight || !cLeft || !group) return

        const d = 18
        const xOffset = d * Math.cos(Math.PI / 6)
        const yOffset = d * Math.sin(Math.PI / 6)

        const tl = gsap.timeline({
          repeat: -1,
          defaults: { ease: "power2.inOut" },
        })

        gsap.set([cTop, cRight, cLeft], { x: 0, y: 0, fill: color })
        gsap.set(group, { rotation: 120, scale: 1 })

        tl.to(cTop, { y: -d, fill: color, duration: 0.55, ease: "power3.out" })
          .to(cRight, { x: xOffset, y: yOffset, fill: color, duration: 0.55, ease: "power3.out" }, "<")
          .to(cLeft, { x: -xOffset, y: yOffset, fill: color, duration: 0.55, ease: "power3.out" }, "<")
          .to(group, { rotation: 0, duration: 0.55, ease: "power3.out" }, "<")

        tl.to({}, { duration: 0.2 })

        tl.to([cTop, cRight, cLeft], { x: 0, y: 0, fill: color, duration: 0.55, ease: "power3.in" })
          .to(group, { rotation: -120, duration: 0.55, ease: "power3.in" }, "<")

        tl.to(group, {
          rotation: -240,
          scale: 1.15,
          transformOrigin: "center center",
          duration: 0.18,
          ease: "power1.out",
        }).to(group, {
          scale: 1,
          transformOrigin: "center center",
          duration: 0.18,
          ease: "power1.in",
        })

        return () => tl.kill()
      })

      return () => media.revert()
    },
    { scope: containerRef },
  )

  return (
    <svg
      ref={containerRef}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-capta-text-primary overflow-visible", className)}
      aria-label="Carregando..."
      role="status"
    >
      <g ref={groupRef} transform="translate(32, 32)">
        <circle ref={circleTopRef} r="5" fill={color} />
        <circle ref={circleRightRef} r="5" fill={color} />
        <circle ref={circleLeftRef} r="5" fill={color} />
      </g>
    </svg>
  )
}
