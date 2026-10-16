"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

gsap.registerPlugin(useGSAP)

function useHomePageEntrance(scope: RefObject<HTMLElement | null>, onReady: () => void) {
  useGSAP(
    () => {
      const page = scope.current

      if (!page) {
        return undefined
      }

      const select = <Element extends HTMLElement>(selector: string) => Array.from(page.querySelectorAll<Element>(selector))
      const avatar = page.querySelector<HTMLElement>("[data-home-greeting-avatar]")
      const greetingText = select("[data-home-greeting-salutation], [data-home-greeting-title]")
      const hero = page.querySelector<HTMLElement>("[data-home-hero]")
      const heroImage = page.querySelector<HTMLElement>("[data-home-hero-image]")
      const heroContent = select("[data-home-hero-badge], [data-home-hero-title-line], [data-home-hero-actions]")
      const shortcutsHeading = select("[data-home-shortcuts-title], [data-home-shortcuts-divider]")
      const shortcutCards = select("[data-home-shortcut-card]")
      const media = gsap.matchMedia()

      onReady()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ defaults: { ease: "power2.out" } })

        timeline
          .fromTo(page, { autoAlpha: 0, y: 4 }, { autoAlpha: 1, duration: 0.4, y: 0 })
          .fromTo(avatar, { autoAlpha: 0, scale: 0.82 }, { autoAlpha: 1, duration: 0.45, ease: "back.out(1.4)", scale: 1 }, "<0.08")
          .fromTo(greetingText, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, duration: 0.4, stagger: 0.06, y: 0 }, "<0.08")
          .fromTo(hero, { autoAlpha: 0, scale: 0.985, y: 12 }, { autoAlpha: 1, duration: 0.55, scale: 1, y: 0 }, ">0.12")
          .fromTo(heroImage, { scale: 1.04, transformOrigin: "center 40%" }, { duration: 1.2, ease: "power1.out", scale: 1 }, "<")
          .fromTo(heroContent, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, duration: 0.45, stagger: 0.08, y: 0 }, "<0.18")
          .fromTo(shortcutsHeading, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, duration: 0.4, stagger: 0.06, y: 0 }, ">0.12")
          .fromTo(shortcutCards, { autoAlpha: 0, scale: 0.97, y: 28 }, { autoAlpha: 1, duration: 0.55, scale: 1, stagger: 0.12, y: 0 }, "<0.08")

        return () => timeline.kill()
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([page, avatar, ...greetingText, hero, heroImage, ...heroContent, ...shortcutsHeading, ...shortcutCards], {
          autoAlpha: 1,
          scale: 1,
          y: 0,
        })
        return undefined
      })

      return () => media.revert()
    },
    { dependencies: [onReady], scope },
  )
}

export { useHomePageEntrance }
