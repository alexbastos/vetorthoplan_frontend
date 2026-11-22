"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"

import { useHeroWordCycle } from "./use-hero-word-cycle"
import { HeroTitleCharacters } from "./hero-title-characters"
import styles from "./hero-word-cycler.module.css"

type HeroWord = {
  key: "surgeries" | "corrections" | "implants"
  label: string
}

const icons = {
  surgeries: "/images/landing/veterinaria.svg",
  implants: "/images/landing/bone.svg",
  corrections: "/images/landing/hand-squeezing-tube.svg",
} as const

function HeroWordCycler({ words }: { words: readonly HeroWord[] }) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const measurementRef = useRef<HTMLSpanElement>(null)
  const { index, phase } = useHeroWordCycle(rootRef, words.length)
  const word = words[index]

  useEffect(() => {
    const root = rootRef.current
    const measurements = measurementRef.current
    if (!root || !measurements) return

    const measure = () => {
      const active = measurements.children[index]
      if (active) root.style.setProperty("--slot-width", `${active.getBoundingClientRect().width}px`)
    }

    const observer = new ResizeObserver(measure)
    for (const child of measurements.children) observer.observe(child)
    measure()

    return () => observer.disconnect()
  }, [index, words])

  return (
    <span aria-hidden="true" className={styles.cycler} ref={rootRef}>
      <span className={styles.measurements} ref={measurementRef}>
        {words.map(({ key, label }) => {
          return (
            <span className={styles.term} key={key}>
              <span className={styles.icon}><Image alt="" src={icons[key]} width={40} height={40} /></span>
              <span>{label}</span>
            </span>
          )
        })}
      </span>

      <span className={styles.slot}>
        <span className={styles.term} data-phase={phase} key={word.key}>
          <span className={styles.icon} data-word={word.key} data-hero-entrance-icon><Image alt="" src={icons[word.key]} width={40} height={40} /></span>
          <span className={styles.word}><HeroTitleCharacters>{word.label}</HeroTitleCharacters></span>
        </span>
      </span>
    </span>
  )
}

export { HeroWordCycler }
