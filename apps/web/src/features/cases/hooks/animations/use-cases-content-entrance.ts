"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { type RefObject, useRef } from "react"

gsap.registerPlugin(useGSAP)

type CasesContentEntranceVariant = "empty" | "error" | "list"

/** Content enters on mount, after data/Suspense resolves; refetches do not replay it. */
function useCasesContentEntrance(
  scope: RefObject<HTMLElement | null>,
  variant: CasesContentEntranceVariant,
  isDestinationHandoffActive: boolean,
) {
  const wasDestinationHandoffRef = useRef(isDestinationHandoffActive)
  const hasEnteredRef = useRef(false)

  useGSAP(() => {
    const content = scope.current
    if (!content) return undefined

    const select = (selector: string) => Array.from(content.querySelectorAll<HTMLElement>(selector))
    const illustration = select('[data-empty-state-part="illustration"]')
    const text = select('[data-empty-state-part="title"], [data-empty-state-part="description"]')
    const action = select('[data-empty-state-part="action"]')
    const filters = select("[data-cases-filters]")
    // Limit individual row tweens and total stagger time for long lists.
    const rows = select('[data-cases-panel][data-state="active"] [data-cases-row]').slice(0, 12)
    const filteredEmptyState = select('[data-cases-panel][data-state="active"] [data-cases-filter-empty]')
    const parts = [...illustration, ...text, ...action, ...filters, ...rows, ...filteredEmptyState]
    const targets = [content, ...parts]
    const clearProps = "opacity,visibility,transform,willChange"
    const reveal = () => {
      hasEnteredRef.current = true
      gsap.set(targets, { clearProps })
      content.dataset.casesEntrance = "ready"
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

      gsap.set(content, { autoAlpha: 0, willChange: "opacity" })
      if (parts.length > 0) {
        gsap.set(parts, { autoAlpha: 0, willChange: "transform,opacity", y: 16 })
      }
      if (illustration.length > 0) {
        gsap.set(illustration, { scale: 0.96 })
      }
      content.dataset.casesEntrance = "ready"

      const timeline = gsap.timeline({
        defaults: { ease: "power2.out", overwrite: "auto" },
        onComplete: () => {
          hasEnteredRef.current = true
        },
      })

      timeline
        .addLabel("content", 0.18)
        .to(content, { autoAlpha: 1, duration: 0.28 }, 0.12)

      if (variant === "list") {
        if (filters.length > 0) {
          timeline.to(filters, { autoAlpha: 1, duration: 0.4, y: 0 }, "content")
        }
        if (rows.length > 0) {
          timeline.to(rows, {
            autoAlpha: 1,
            duration: 0.48,
            stagger: { amount: Math.min(0.36, Math.max(0, rows.length - 1) * 0.06) },
            y: 0,
          }, "content+=0.12")
        }
        if (filteredEmptyState.length > 0) {
          timeline.to(filteredEmptyState, { autoAlpha: 1, duration: 0.45, y: 0 }, "content+=0.12")
        }
      } else {
        if (illustration.length > 0) {
          timeline.to(illustration, { autoAlpha: 1, duration: 0.5, scale: 1, y: 0 }, "content")
        }
        if (text.length > 0) {
          timeline.to(text, { autoAlpha: 1, duration: 0.4, stagger: 0.07, y: 0 }, "content+=0.14")
        }
        if (action.length > 0) {
          timeline.to(action, { autoAlpha: 1, duration: 0.4, y: 0 }, "content+=0.34")
        }
      }

      timeline.set(targets, { clearProps })

      return () => timeline.kill()
    })

    media.add("(prefers-reduced-motion: reduce)", reveal)

    return () => media.revert()
  }, { dependencies: [isDestinationHandoffActive, variant], revertOnUpdate: true, scope })
}

export { useCasesContentEntrance }
export type { CasesContentEntranceVariant }
