"use client"

import { useRef, type ReactNode } from "react"

import { useLandingFadeIn } from "./use-landing-fade-in"
import styles from "./landing-fade-in.module.css"

// One client boundary for viewport entry; children stay server-rendered.
function LandingFadeIn({ children, className }: { children: ReactNode; className: string }) {
  const scope = useRef<HTMLDivElement>(null)
  useLandingFadeIn(scope)

  return <div ref={scope} className={`${styles.root} ${className}`} data-landing-fade="pending">{children}</div>
}

export { LandingFadeIn }
