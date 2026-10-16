import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

gsap.registerPlugin(useGSAP)

function useLandingEntrance(scope: RefObject<HTMLDivElement | null>) {
  useGSAP(() => {
    const root = scope.current
    if (!root) return

    const brand = root.querySelector<HTMLElement>("[data-landing-header-brand]")
    const navigation = root.querySelector<HTMLElement>("[data-landing-header-navigation]")
    const headerActions = root.querySelector<HTMLElement>("[data-landing-header-actions]")
    const visual = root.querySelector<SVGSVGElement>("[data-landing-hero-visual]")
    const eyebrow = root.querySelector<HTMLElement>("[data-landing-hero-eyebrow]")
    const titleLines = gsap.utils.toArray<HTMLElement>("[data-landing-hero-title-line]", root)
    const description = root.querySelector<HTMLElement>("[data-landing-hero-description]")
    const heroActions = root.querySelector<HTMLElement>("[data-landing-hero-actions]")
    const targets = [brand, navigation, headerActions, visual, eyebrow, ...titleLines, description, heroActions]
      .filter((element): element is HTMLElement | SVGSVGElement => element !== null)

    if (!visual || targets.length === 0) return

    const media = gsap.matchMedia()
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const timeline = gsap.timeline({ defaults: { ease: "power2.out", overwrite: "auto" } })

      timeline.fromTo(brand, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, duration: 0.32, y: 0 }, 0)
      timeline.fromTo(navigation, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, duration: 0.32, y: 0 }, 0.06)
      timeline.fromTo(headerActions, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, duration: 0.32, y: 0 }, 0.12)
      timeline.fromTo(
        visual,
        { autoAlpha: 0, scale: 1.03, transformOrigin: "center" },
        { autoAlpha: 1, duration: 0.7, ease: "power1.out", scale: 1 },
        0.18,
      )
      timeline.fromTo(eyebrow, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, duration: 0.4, y: 0 }, 0.34)
      timeline.fromTo(titleLines, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, duration: 0.45, stagger: 0.09, y: 0 }, 0.42)
      timeline.fromTo(description, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, duration: 0.4, y: 0 }, 0.7)
      timeline.fromTo(heroActions, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, duration: 0.4, y: 0 }, 0.82)
    })

    media.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(targets, { autoAlpha: 1, scale: 1, y: 0 })
    })

    return () => media.revert()
  }, { scope, dependencies: [scope], revertOnUpdate: true })
}

export { useLandingEntrance }
