"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, type RefObject } from "react"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useRoutineBenefitsEntrance(scope: RefObject<HTMLDivElement | null>) {
  const entered = useRef(new Set<HTMLElement>())

  useGSAP(() => {
    const root = scope.current
    if (!root) return
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-routine-reveal]"))
    const media = gsap.matchMedia()

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const pending = targets.filter(target => !entered.current.has(target))
      gsap.set(pending, { autoAlpha: 0 })

      // Each row enters when it actually reaches the viewport, including the
      // stacked mobile layout. Keep all tweens scoped for automatic cleanup.
      pending.forEach(target => {
        gsap.to(target, {
          autoAlpha: 1,
          duration: .7,
          ease: "power2.out",
          clearProps: "opacity,visibility",
          scrollTrigger: { trigger: target, start: "top 85%", once: true },
          onComplete: () => { entered.current.add(target) },
        })
      })
    })

    root.dataset.routineMotion = "ready"
    return () => media.revert()
  }, { scope })
}

export { useRoutineBenefitsEntrance }
