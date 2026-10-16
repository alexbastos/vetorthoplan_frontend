"use client"

import { useRef, type ReactNode } from "react"

import { useLandingEntrance } from "@/features/landing/hooks/animations/use-landing-entrance"

type LandingEntranceProps = {
  children: ReactNode
}

function LandingEntrance({ children }: LandingEntranceProps) {
  const scope = useRef<HTMLDivElement>(null)
  useLandingEntrance(scope)

  return <div ref={scope} className="contents">{children}</div>
}

export { LandingEntrance }
