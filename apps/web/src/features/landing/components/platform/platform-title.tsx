"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"

import styles from "./platform-section.module.css"

type PlatformTitleProps = {
  text: string
}

function PlatformTitle({ text }: PlatformTitleProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [phase, setPhase] = useState<"idle" | "pending" | "active">("idle")

  useEffect(() => {
    const heading = headingRef.current

    if (
      !heading ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    setPhase("pending")

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("active")
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )

    observer.observe(heading)

    return () => observer.disconnect()
  }, [])

  const phaseClass = phase === "pending" ? styles.titlePending : phase === "active" ? styles.titleActive : ""

  return (
    <h2
      aria-label={text}
      className={`${styles.title} ${phaseClass}`}
      id="orthovet-platform-title"
      ref={headingRef}
    >
      <span aria-hidden="true">
        {Array.from(text).map((character, index) => (
          <span
            className={styles.titleCharacter}
            key={index}
            style={{ "--character-delay": `${index * 25}ms` } as CSSProperties}
          >
            {character}
          </span>
        ))}
      </span>
    </h2>
  )
}

export { PlatformTitle }
