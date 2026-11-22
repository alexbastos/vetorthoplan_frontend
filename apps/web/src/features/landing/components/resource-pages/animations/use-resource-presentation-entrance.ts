"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, type RefObject } from "react"

import { addResourceHeadingEntrance } from "./resource-heading-entrance"

gsap.registerPlugin(useGSAP, ScrollTrigger)

function useResourcePresentationEntrance(scope: RefObject<HTMLElement | null>) {
  const hasEntered = useRef(false)

  useGSAP(() => {
    const root = scope.current
    if (!root) return
    const select = (selector: string) => Array.from(root.querySelectorAll<HTMLElement | SVGElement>(selector))
    const heading = root.querySelector<HTMLElement>("[data-resource-heading]")
    const copy = select("[data-resource-tagline], [data-resource-facts]")
    const visual = select("[data-resource-visual]")
    const rows = select("[data-preview-row]")
    const fills = select("[data-preview-fill]")
    const segments = select("[data-preview-segment]")
    const counter = root.querySelector<HTMLElement>("[data-preview-progress]")
    const targets = [...copy, ...visual, ...rows, ...fills]
    const media = gsap.matchMedia()

    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (hasEntered.current) return
      gsap.set([...copy, ...visual], { autoAlpha: 0, y: 12 })
      if (rows.length) gsap.set(rows, { opacity: 0, x: 4 })
      if (fills.length) gsap.set(fills, { scaleX: 0, transformOrigin: "left center" })
      if (segments.length) gsap.set(segments, { strokeDasharray: "0 100" })
      if (counter) gsap.set(counter, { "--progress-count": 0 })

      const timeline = gsap.timeline({
        defaults: { ease: "power2.out", overwrite: "auto" },
        scrollTrigger: { trigger: root, start: "top 85%", once: true },
        onComplete: () => { hasEntered.current = true },
      })

      addResourceHeadingEntrance(timeline, heading)
      timeline
        .to(copy, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1 }, 0.12)
      if (visual.length) timeline.to(visual, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.16)

      // Preview internals are optional; new resource pages supply their own visual.
      if (rows.length) timeline.to(rows, { opacity: 1, x: 0, duration: 0.7, stagger: 0.15 }, 0.5)
      if (fills.length) timeline.to(fills, { scaleX: 1, duration: 1.2, stagger: 0.15 }, 0.5)
      if (segments.length) {
        timeline.to(segments, {
          strokeDasharray: (_index: number, element: SVGCircleElement) => element.getAttribute("stroke-dasharray") ?? "24 76",
          duration: 1.8,
        }, 0.3)
      }

      if (counter) {
        timeline.to(counter, {
          "--progress-count": Number(counter.dataset.previewProgress),
          // The registered CSS property accepts integers, not fractional frames.
          snap: { "--progress-count": 1 }, duration: 1.8,
        }, 0.3)
      }

      timeline.set(targets, { clearProps: "opacity,visibility,transform,transformOrigin" })
      if (segments.length) timeline.set(segments, { clearProps: "strokeDasharray" })
      if (counter) timeline.set(counter, { clearProps: "--progress-count" })
    })

    root.dataset.resourceMotion = "ready"
    return () => media.revert()
  }, { scope })
}

export { useResourcePresentationEntrance }
