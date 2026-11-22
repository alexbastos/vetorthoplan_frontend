"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, type RefObject } from "react"

import { addResourceHeadingEntrance } from "./resource-heading-entrance"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useResourceReveal(scope: RefObject<HTMLElement | null>, delay: number) {
  const hasEntered = useRef(false)

  useGSAP(() => {
    const element = scope.current
    if (!element) return
    const media = gsap.matchMedia()

    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (hasEntered.current) return
      const timeline = gsap.timeline({
        defaults: { duration: 0.7, ease: "power2.out" }, delay,
        scrollTrigger: { trigger: element, start: "top 85%", once: true },
        onComplete: () => { hasEntered.current = true },
      })
      const heading = element.querySelector<HTMLElement>("[data-resource-heading]")

      if (heading) {
        const copy = Array.from(element.querySelectorAll<HTMLElement>(":scope > p"))
        gsap.set(copy, { autoAlpha: 0, y: 12 })
        addResourceHeadingEntrance(timeline, heading)
        timeline.to(copy, { autoAlpha: 1, y: 0, clearProps: "opacity,visibility,transform" }, 0.12)
      } else {
        gsap.set(element, { autoAlpha: 0, y: 12 })
        timeline.to(element, { autoAlpha: 1, y: 0, clearProps: "opacity,visibility,transform" })
      }
    })

    // Release the server-rendered guard only after GSAP has prepared its state.
    element.dataset.resourceMotion = "ready"
    return () => media.revert()
  }, { scope })
}

export { useResourceReveal }
