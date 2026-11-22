"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useState, type RefObject } from "react"

import type { SimulationPreviewSelection } from "../simulation-preview-copy"
import { buildSimulationPreviewTimeline } from "./simulation-preview-timeline"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useSimulationPreviewCycle(scope: RefObject<HTMLDivElement | null>, caseCount: number) {
  const [selection, setSelection] = useState<SimulationPreviewSelection>({ index: 0, step: 0, phase: "editing" })

  useGSAP(() => {
    const root = scope.current
    if (!root) return
    const media = gsap.matchMedia()
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const select = (next: SimulationPreviewSelection) => setSelection(previous =>
        previous.step === next.step && previous.index === next.index && previous.phase === next.phase ? previous : next)
      select({ index: 0, step: 0, phase: "editing" })
      const timeline = buildSimulationPreviewTimeline(root, select)
      if (!timeline) return
      let started = false
      let inView = ScrollTrigger.isInViewport(root)
      const sync = () => {
        if (started && inView && !document.hidden) timeline.resume()
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
      document.addEventListener("visibilitychange", sync)
      return () => document.removeEventListener("visibilitychange", sync)
    })
    return () => media.revert()
  }, { scope, dependencies: [caseCount], revertOnUpdate: true })

  return selection
}

export { useSimulationPreviewCycle }
