"use client"

import { useEffect, useRef } from "react"

import { mountCommunityIllustration } from "./community-figure"
import styles from "./community-illustration.module.css"

function CommunityIllustration({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (svg) return mountCommunityIllustration(svg)
  }, [])

  return (
    <svg
      aria-hidden="true"
      className={className ? `${styles.figure} ${className}` : styles.figure}
      fill="none"
      focusable="false"
      ref={svgRef}
      viewBox="0 0 400 320"
    />
  )
}

export { CommunityIllustration }
