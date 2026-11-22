"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, type RefObject } from "react"

import { addResourceHeadingEntrance } from "../resource-pages/animations/resource-heading-entrance"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useFaqEntrance(scope: RefObject<HTMLDivElement | null>) {
  const hasEntered = useRef(false)

  useGSAP(() => {
    const root = scope.current
    if (!root) return
    const media = gsap.matchMedia()

    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (hasEntered.current) return

      const heading = root.querySelector<HTMLElement>("[data-resource-heading]")
      const eyebrow = root.querySelector<HTMLElement>("[data-faq-eyebrow]")
      const items = Array.from(root.querySelectorAll<HTMLElement>("[data-faq-item]"))

      // Prepare only the content; leave the grid and sticky header untransformed.
      gsap.set(eyebrow, { autoAlpha: 0, y: 12 })
      gsap.set(items, { autoAlpha: 0, y: 12 })

      const timeline = gsap.timeline({
        defaults: { duration: .7, ease: "power2.out" },
        scrollTrigger: { trigger: root, start: "top 85%", once: true },
        onComplete: () => { hasEntered.current = true },
      })

      addResourceHeadingEntrance(timeline, heading, .12)
      timeline
        .to(eyebrow, { autoAlpha: 1, y: 0, clearProps: "opacity,visibility,transform" }, 0)
        .to(items, {
          autoAlpha: 1, y: 0, stagger: .1,
          clearProps: "opacity,visibility,transform",
        }, .24)
    })

    // Release the SSR guard only after the initial GSAP states are prepared.
    root.dataset.faqMotion = "ready"
    return () => media.revert()
  }, { scope })
}

export { useFaqEntrance }
