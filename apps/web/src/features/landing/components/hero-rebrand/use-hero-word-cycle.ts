"use client"

import { useEffect, useState, type RefObject } from "react"
import { useHeroEntranceReady } from "./hero-entrance"

type CycleFrame = { index: number; phase: "idle" | "exit" | "enter" }

function useHeroWordCycle(rootRef: RefObject<HTMLSpanElement | null>, count: number) {
  const entranceReady = useHeroEntranceReady()
  const [frame, setFrame] = useState<CycleFrame>({ index: 0, phase: "idle" })

  useEffect(() => {
    const root = rootRef.current
    if (!root || count < 2 || !entranceReady) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let inViewport = false
    let index = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const canAnimate = () => inViewport && !document.hidden && !reducedMotion.matches
    const schedule = () => {
      timer = setTimeout(() => {
        if (!canAnimate()) return
        setFrame({ index, phase: "exit" })

        timer = setTimeout(() => {
          index = (index + 1) % count
          setFrame({ index, phase: "enter" })

          timer = setTimeout(() => {
            setFrame({ index, phase: "idle" })
            if (canAnimate()) schedule()
          }, 220)
        }, 120)
      }, 2000)
    }

    const syncActivity = () => {
      clearTimeout(timer)
      if (reducedMotion.matches) index = 0
      setFrame({ index, phase: "idle" })
      if (canAnimate()) schedule()
    }

    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting
      syncActivity()
    })

    observer.observe(root)
    reducedMotion.addEventListener("change", syncActivity)
    document.addEventListener("visibilitychange", syncActivity)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
      reducedMotion.removeEventListener("change", syncActivity)
      document.removeEventListener("visibilitychange", syncActivity)
    }
  }, [count, rootRef, entranceReady])

  return frame
}

export { useHeroWordCycle }
