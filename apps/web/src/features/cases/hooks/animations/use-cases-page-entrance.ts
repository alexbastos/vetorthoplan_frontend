"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { type RefObject, useRef } from "react"

gsap.registerPlugin(useGSAP)

/** The header enters once per mount, independently of query and filter updates. */
function useCasesPageEntrance(scope: RefObject<HTMLElement | null>, isDestinationHandoffActive: boolean) {
  const wasDestinationHandoffRef = useRef(isDestinationHandoffActive)
  const hasEnteredRef = useRef(false)

  useGSAP(() => {
    const page = scope.current
    if (!page) return undefined

    const headerParts = Array.from(page.querySelectorAll<HTMLElement>("[data-cases-header-part]"))
    const targets = [page, ...headerParts]
    const clearProps = "opacity,visibility,transform,willChange"
    const reveal = () => {
      hasEnteredRef.current = true
      gsap.set(targets, { clearProps })
      page.dataset.casesEntrance = "ready"
    }

    if (isDestinationHandoffActive || wasDestinationHandoffRef.current) {
      wasDestinationHandoffRef.current = true
      reveal()
      return undefined
    }

    const media = gsap.matchMedia()

    media.add("(prefers-reduced-motion: no-preference)", () => {
      if (hasEnteredRef.current) {
        reveal()
        return undefined
      }

      gsap.set(page, { autoAlpha: 0, willChange: "opacity" })
      gsap.set(headerParts, { autoAlpha: 0, willChange: "transform,opacity", y: 12 })
      page.dataset.casesEntrance = "ready"

      const timeline = gsap.timeline({
        defaults: { ease: "power2.out", overwrite: "auto" },
        onComplete: () => {
          hasEnteredRef.current = true
        },
      })

      timeline
        .addLabel("header", 0.04)
        .to(page, { autoAlpha: 1, duration: 0.3 }, 0)
        .to(headerParts, { autoAlpha: 1, duration: 0.42, stagger: 0.07, y: 0 }, "header")
        .set(targets, { clearProps })

      return () => timeline.kill()
    })

    media.add("(prefers-reduced-motion: reduce)", reveal)

    return () => media.revert()
  }, { dependencies: [isDestinationHandoffActive], revertOnUpdate: true, scope })
}

export { useCasesPageEntrance }
