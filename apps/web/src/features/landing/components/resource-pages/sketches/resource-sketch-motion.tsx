"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, type ReactNode } from "react"

import { buildResourceSketchTimeline } from "./resource-sketch-timeline"
import styles from "./resource-sketch.module.css"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function ResourceSketchMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const root = scope.current
    if (!root) return
    const media = gsap.matchMedia()

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const timeline = buildResourceSketchTimeline(root)
      let started = false
      let inView = ScrollTrigger.isInViewport(root)

      const sync = () => {
        if (!started || timeline.progress() === 1) return
        if (inView && !document.hidden) timeline.resume()
        else timeline.pause()
      }

      ScrollTrigger.create({
        trigger: root, start: "top bottom", end: "bottom top",
        onToggle: trigger => { inView = trigger.isActive; sync() },
      })
      ScrollTrigger.create({
        trigger: root, start: "45% bottom", once: true,
        onEnter: () => { started = true; sync() },
      })

      const replay = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !inView || document.hidden || !started || timeline.progress() !== 1 ||
          !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
        timeline.restart()
      }

      root.addEventListener("pointerenter", replay)
      document.addEventListener("visibilitychange", sync)
      return () => {
        root.removeEventListener("pointerenter", replay)
        document.removeEventListener("visibilitychange", sync)
      }
    })

    root.dataset.resourceMotion = "ready"
    return () => media.revert()
  }, { scope })

  return (
    <div className={styles.motion} ref={scope} data-resource-motion="pending">
      {children}
    </div>
  )
}

export { ResourceSketchMotion }
