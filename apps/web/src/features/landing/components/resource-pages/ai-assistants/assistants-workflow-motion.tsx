"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, type ReactNode } from "react"

import { buildAssistantsWorkflowTimeline } from "./assistants-workflow-timeline"
import styles from "./assistants-workflow.module.css"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function AssistantsWorkflowMotion({ children }: { children: ReactNode }) {
  const scope = useRef<SVGGElement>(null)

  useGSAP(() => {
    const root = scope.current
    if (!root) return
    const media = gsap.matchMedia()
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const timeline = buildAssistantsWorkflowTimeline(root)
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
    root.dataset.workflowMotion = "ready"
    return () => media.revert()
  }, { scope })

  return <g ref={scope} className={styles.flow} data-workflow-motion="pending">{children}</g>
}

export { AssistantsWorkflowMotion }
