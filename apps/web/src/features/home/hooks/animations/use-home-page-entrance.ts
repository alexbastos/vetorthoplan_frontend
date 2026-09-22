"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

gsap.registerPlugin(useGSAP)

function useHomePageEntrance(
  scope: RefObject<HTMLElement | null>,
  onDestinationTransitionComplete: () => void,
  isDestinationHandoffActive: boolean,
) {
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
      const overlay = document.querySelector<HTMLElement>("[data-login-handoff-overlay]")
      const appShell = document.querySelector<HTMLElement>("[data-app-shell]")
      const isLoginHandoff = isDestinationHandoffActive && Boolean(overlay && appShell)
      const destinationSurface = isLoginHandoff && appShell ? appShell : page
      const dashboardStart = isLoginHandoff ? 0.45 : 0
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(destinationSurface, { autoAlpha: 0, y: 4 })
        gsap.set([avatar, ...greetingText], { autoAlpha: 0, scale: 1, y: 12 })
        gsap.set(hero, { autoAlpha: 0, scale: 0.985, y: 12 })
        gsap.set(heroImage, { scale: 1.04, transformOrigin: "center 40%" })
        gsap.set(heroContent, { autoAlpha: 0, y: 16 })
        gsap.set(shortcutsHeading, { autoAlpha: 0, y: 12 })
        gsap.set(shortcutCards, { autoAlpha: 0, scale: 0.97, y: 28 })
        if (isLoginHandoff && overlay) {
          gsap.set(overlay, { autoAlpha: 1, y: 0 })
        }

        const timeline = gsap.timeline({ defaults: { ease: "power2.out" } })

        timeline
          .to(destinationSurface, { autoAlpha: 1, duration: 0.6, y: 0 }, dashboardStart)
          .to(avatar, { autoAlpha: 1, duration: 0.45, ease: "back.out(1.4)", scale: 1, y: 0 }, dashboardStart + 0.08)
          .to(greetingText, { autoAlpha: 1, duration: 0.4, stagger: 0.06, y: 0 }, dashboardStart + 0.08)
          .to(hero, { autoAlpha: 1, duration: 0.55, scale: 1, y: 0 }, dashboardStart + 0.6)
          .to(heroImage, { duration: 1.2, ease: "power1.out", scale: 1 }, dashboardStart + 0.6)
          .to(heroContent, { autoAlpha: 1, duration: 0.45, stagger: 0.08, y: 0 }, dashboardStart + 0.78)
          .to(shortcutsHeading, { autoAlpha: 1, duration: 0.4, stagger: 0.06, y: 0 }, dashboardStart + 1.27)
          .to(shortcutCards, { autoAlpha: 1, duration: 0.55, scale: 1, stagger: 0.12, y: 0 }, dashboardStart + 1.35)

        if (isLoginHandoff && overlay) {
          timeline
            .to(overlay, { autoAlpha: 0, duration: 0.45, ease: "power2.out", y: 0 }, 0)
            .call(onDestinationTransitionComplete, [], 0.45)
        }

        return () => timeline.kill()
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([destinationSurface, avatar, ...greetingText, hero, heroImage, ...heroContent, ...shortcutsHeading, ...shortcutCards], {
          autoAlpha: 1,
          scale: 1,
          y: 0,
        })
        if (isLoginHandoff && overlay) {
          gsap.set(overlay, { autoAlpha: 0, y: 0 })
        }

        if (isLoginHandoff) {
          onDestinationTransitionComplete()
        }

        return undefined
      })

      return () => media.revert()
    },
    { dependencies: [onDestinationTransitionComplete], scope },
  )
}

export { useHomePageEntrance }
