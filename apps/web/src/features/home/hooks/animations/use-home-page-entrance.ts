"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useRef, type RefObject } from "react"

gsap.registerPlugin(useGSAP)

function useHomePageEntrance(scope: RefObject<HTMLElement | null>, isDestinationHandoffActive: boolean) {
  const wasDestinationHandoffRef = useRef(isDestinationHandoffActive)
  const hasEnteredRef = useRef(false)

  useGSAP(
    () => {
      const page = scope.current
      if (!page) return undefined

      const select = (selector: string) => Array.from(page.querySelectorAll<HTMLElement>(selector))
      const avatar = select("[data-home-greeting-avatar]")
      const greetingText = select("[data-home-greeting-salutation], [data-home-greeting-title]")
      const banners = select("[data-home-banner]")
      const bannerImages = select("[data-home-banner-image]")
      const bannerContent = select("[data-home-banner-content]")
      const shortcutsHeading = select("[data-home-shortcuts-heading], [data-home-shortcuts-divider]")
      // Animate wrappers so the cards' CSS hover transforms remain independent.
      const shortcutItems = select("[data-home-shortcut-item]")
      const targets = [
        page,
        ...avatar,
        ...greetingText,
        ...banners,
        ...bannerImages,
        ...bannerContent,
        ...shortcutsHeading,
        ...shortcutItems,
      ]
      const clearProps = "opacity,visibility,transform,transformOrigin,willChange"

      const reveal = () => {
        hasEnteredRef.current = true
        gsap.set(targets, { clearProps })
        page.dataset.homeEntrance = "ready"
      }

      if (isDestinationHandoffActive || wasDestinationHandoffRef.current) {
        wasDestinationHandoffRef.current = true
        // The AppShell owns the entrance after login; never animate it twice.
        reveal()
        return undefined
      }

      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        if (hasEnteredRef.current) {
          reveal()
          return undefined
        }

        gsap.set(targets, { willChange: "transform,opacity" })
        gsap.set(page, { autoAlpha: 0, y: 4 })
        gsap.set([...avatar, ...greetingText], { autoAlpha: 0, y: 12 })
        gsap.set(banners, { autoAlpha: 0, scale: 0.985, y: 12 })
        gsap.set(bannerImages, { scale: 1.04, transformOrigin: "center 40%" })
        gsap.set(bannerContent, { autoAlpha: 0, y: 16 })
        gsap.set(shortcutsHeading, { autoAlpha: 0, y: 12 })
        gsap.set(shortcutItems, { autoAlpha: 0, scale: 0.97, y: 28 })

        // Release the CSS hydration guard only after every start state is set.
        page.dataset.homeEntrance = "ready"

        const timeline = gsap.timeline({
          defaults: { ease: "power2.out", overwrite: "auto" },
          onComplete: () => {
            hasEnteredRef.current = true
          },
        })

        timeline
          .addLabel("greeting", 0.08)
          .addLabel("banners", 0.6)
          .addLabel("bannerContent", 0.78)
          .addLabel("shortcutsHeading", 1.27)
          .addLabel("shortcuts", 1.35)
          .to(page, { autoAlpha: 1, duration: 0.6, y: 0 }, 0)
          .to(avatar, { autoAlpha: 1, duration: 0.45, ease: "back.out(1.4)", y: 0 }, "greeting")
          .to(greetingText, { autoAlpha: 1, duration: 0.4, stagger: 0.06, y: 0 }, "greeting")
          .to(banners, { autoAlpha: 1, duration: 0.55, scale: 1, stagger: 0.08, y: 0 }, "banners")
          .to(bannerImages, { duration: 1.2, ease: "power1.out", scale: 1 }, "banners")
          .to(bannerContent, { autoAlpha: 1, duration: 0.45, stagger: 0.08, y: 0 }, "bannerContent")
          .to(shortcutsHeading, { autoAlpha: 1, duration: 0.4, stagger: 0.06, y: 0 }, "shortcutsHeading")
          .to(shortcutItems, { autoAlpha: 1, duration: 0.55, scale: 1, stagger: 0.12, y: 0 }, "shortcuts")
          .set(targets, { clearProps })

        return () => timeline.kill()
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        reveal()
      })

      return () => media.revert()
    },
    { dependencies: [isDestinationHandoffActive], revertOnUpdate: true, scope },
  )
}

export { useHomePageEntrance }
