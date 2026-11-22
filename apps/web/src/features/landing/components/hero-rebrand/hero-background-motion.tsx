"use client"

import { useEffect, useRef, type ReactNode } from "react"

import styles from "./hero-background.module.css"

function HeroBackgroundMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    root.dataset.paused = "true"
    root.dataset.started = "false"
    const html = document.documentElement
    const hadHeroJs = html.classList.contains("hero-js")
    const hadHeroIn = html.classList.contains("hero-in")
    html.classList.add("hero-js")

    let inViewport = false
    let entered = false
    let startFrame: number | undefined
    const syncActivity = () => {
      const paused = !inViewport || document.hidden
      if (!entered && !paused) {
        if (startFrame === undefined) {
          startFrame = requestAnimationFrame(() => {
            startFrame = undefined
            if (!inViewport || document.hidden) return
            entered = true
            html.classList.add("hero-in")
            root.dataset.started = "true"
            root.dataset.paused = "false"
          })
        }
        return
      }
      root.dataset.paused = String(paused || !entered)
    }

    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting
      syncActivity()
    })

    observer.observe(root)
    document.addEventListener("visibilitychange", syncActivity)

    return () => {
      if (startFrame !== undefined) cancelAnimationFrame(startFrame)
      observer.disconnect()
      document.removeEventListener("visibilitychange", syncActivity)
      if (!hadHeroIn) html.classList.remove("hero-in")
      if (!hadHeroJs) html.classList.remove("hero-js")
    }
  }, [])

  return <div aria-hidden="true" className={styles.scene} data-paused="true" data-started="false" ref={rootRef}>{children}</div>
}

export { HeroBackgroundMotion }
