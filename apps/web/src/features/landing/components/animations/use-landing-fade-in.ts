"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, type RefObject } from "react"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useLandingFadeIn(scope: RefObject<HTMLDivElement | null>) {
  const hasEntered = useRef(false)

  useGSAP(() => {
    const root = scope.current
    if (!root) return
    const media = gsap.matchMedia()

    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (hasEntered.current) return

      gsap.set(root, { autoAlpha: 0 })
      gsap.to(root, {
        autoAlpha: 1,
        duration: .7,
        ease: "power2.out",
        clearProps: "opacity,visibility",
        scrollTrigger: { trigger: root, start: "top 85%", once: true },
        onComplete: () => { hasEntered.current = true },
      })
    })

    root.dataset.landingFade = "ready"
    return () => media.revert()
  }, { scope })
}

export { useLandingFadeIn }
