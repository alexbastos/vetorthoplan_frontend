"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, type RefObject } from "react"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useFooterEntrance(scope: RefObject<HTMLDivElement | null>) {
  useGSAP(() => {
    const root = scope.current
    if (!root) return

    const brand = root.querySelector<HTMLElement>("[data-footer-brand]")
    const columns = Array.from(root.querySelectorAll<HTMLElement>("[data-footer-column]"))
    const bottom = root.querySelector<HTMLElement>("[data-footer-bottom]")
    const media = gsap.matchMedia()

    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.set([brand, ...columns, bottom].filter(Boolean), { autoAlpha: 0 })
      gsap.set(columns, { y: 14 })
      if (bottom) gsap.set(bottom, { y: 8 })

      const timeline = gsap.timeline({
        defaults: { duration: 0.7, ease: "power2.out" },
        scrollTrigger: { trigger: root, start: "top 85%", once: true },
      })

      timeline
        .to(brand, { autoAlpha: 1, clearProps: "opacity,visibility" }, 0)
        .to(columns, { autoAlpha: 1, y: 0, stagger: 0.13, clearProps: "opacity,visibility,transform" }, 0.12)
        .to(bottom, { autoAlpha: 1, y: 0, clearProps: "opacity,visibility,transform" }, 0.48)
    })

    root.dataset.footerMotion = "ready"
    return () => media.revert()
  }, { scope })
}

export { useFooterEntrance }
