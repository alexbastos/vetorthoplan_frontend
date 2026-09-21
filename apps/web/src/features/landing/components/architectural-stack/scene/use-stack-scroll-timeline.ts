import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import type { RefObject } from "react"
import type { Group } from "three"

import { platePosition, stackMotion, stackPlates } from "./stack-scene-config"

gsap.registerPlugin(useGSAP, ScrollTrigger)

type StackSceneHandles = {
  rotation: RefObject<Group | null>
  ecosystem: RefObject<Group | null>
  intelligence: RefObject<Group | null>
  notices: RefObject<Group | null>
  brand: RefObject<Group | null>
  sources: RefObject<(Group | null)[]>
}

function useStackScrollTimeline(
  trigger: RefObject<HTMLDivElement | null>,
  handles: StackSceneHandles,
  invalidate: () => void,
) {
  useGSAP(() => {
    const root = handles.rotation.current
    const ecosystem = handles.ecosystem.current
    if (!root || !ecosystem || !trigger.current) return
    const media = gsap.matchMedia()

    media.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const baseY = platePosition(stackPlates.ecosystem)[1]
      const middle = [handles.intelligence.current, handles.notices.current, handles.brand.current].filter((group): group is Group => group !== null)
      const sources = handles.sources.current.filter((group): group is Group => group !== null)
      gsap.set(root.rotation, { x: 0, y: 0 })
      gsap.set(ecosystem.position, { y: baseY + stackMotion.initialOffset })
      gsap.set([...middle, ...sources].map((group) => group.position), { z: stackMotion.pushZ })

      const timeline = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: trigger.current,
          start: "top top",
          end: "bottom bottom",
          scrub: stackMotion.scrub,
        },
        onUpdate: () => invalidate(),
      })

      timeline.addLabel("context", 0)
      timeline.to(root.rotation, { x: stackMotion.tiltX, y: stackMotion.tiltY, duration: 0.4 }, "context")
      timeline.to(ecosystem.position, { y: baseY + stackMotion.intermediateOffset, duration: 0.4 }, "context")
      middle.forEach((group, index) => {
        timeline.to(group.position, { z: 0, duration: 0.5 }, `context+=${0.4 + index * 0.07}`)
      })

      timeline.addLabel("sources", 1)
      timeline.to(ecosystem.position, { y: baseY, duration: 0.4 }, "sources")
      sources.forEach((group, index) => {
        timeline.to(group.position, { z: 0, duration: 0.4 }, `sources+=${0.4 + index * 0.04}`)
      })

      timeline.addLabel("decision", 2)
      timeline.to(root.rotation, { x: 0, y: 0, duration: 0.7 }, "decision")
      timeline.scrollTrigger?.refresh()
      if (timeline.scrollTrigger) timeline.progress(timeline.scrollTrigger.progress)
      invalidate()

      let resizeTimeout: number | undefined
      const onResize = () => {
        window.clearTimeout(resizeTimeout)
        resizeTimeout = window.setTimeout(() => {
          ScrollTrigger.refresh()
          invalidate()
          resizeTimeout = undefined
        }, 150)
      }
      window.addEventListener("resize", onResize)
      return () => {
        window.removeEventListener("resize", onResize)
        window.clearTimeout(resizeTimeout)
      }
    })

    return () => media.revert()
  }, { dependencies: [trigger, handles, invalidate], revertOnUpdate: true })
}

export { useStackScrollTimeline }
export type { StackSceneHandles }
