"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, type RefObject } from "react"

import { addResourceHeadingEntrance } from "./resource-heading-entrance"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useResourceOverviewEntrance(scope: RefObject<HTMLElement | null>) {
  const hasEntered = useRef(false)

  useGSAP(() => {
    const section = scope.current
    if (!section) return

    const image = section.querySelector<HTMLElement>("[data-overview-image]")
    const heading = section.querySelector<HTMLElement>("[data-resource-heading]")
    const steps = Array.from(section.querySelectorAll<HTMLElement>("[data-overview-copy] > p"))
    if (!image || steps.length === 0) {
      section.dataset.resourceMotion = "ready"
      return
    }

    const targets = [image, ...steps]
    const media = gsap.matchMedia()

    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (hasEntered.current) return

      gsap.set(image, { autoAlpha: 0, x: -40 })
      gsap.set(steps, { autoAlpha: 0, y: 16 })

      const timeline = gsap.timeline({
        defaults: { duration: 0.7, ease: "power2.out", overwrite: "auto" },
        scrollTrigger: { trigger: section, start: "top 85%", once: true },
        onComplete: () => { hasEntered.current = true },
      })

      addResourceHeadingEntrance(timeline, heading, 0.16)
      timeline
        .to(image, { autoAlpha: 1, x: 0 }, 0)
        .to(steps, { autoAlpha: 1, y: 0, stagger: 0.12 }, 0.28)
        .set(targets, { clearProps: "opacity,visibility,transform" })
    })

    section.dataset.resourceMotion = "ready"

    // Reverting the media context also restores visible content if the user
    // enables reduced motion while the entrance is waiting or playing.
    return () => media.revert()
  }, { scope })
}

export { useResourceOverviewEntrance }
