"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

gsap.registerPlugin(useGSAP)

/** Entrada estrutural da página; cada painel mantém animações próprias neste mesmo domínio. */
function useSettingsPageEntrance(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const page = scope.current

      if (!page) {
        return undefined
      }

      const header = page.querySelector<HTMLElement>("[data-settings-page-header]")
      const navigation = page.querySelector<HTMLElement>("[data-settings-navigation]")
      const content = page.querySelector<HTMLElement>("[data-settings-page-content]")
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ defaults: { ease: "power2.out" } })

        timeline
          .fromTo(page, { autoAlpha: 0, y: 4 }, { autoAlpha: 1, duration: 0.3, y: 0 })
          .fromTo(header, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, duration: 0.24, y: 0 }, "<0.04")
          .fromTo([navigation, content], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, duration: 0.28, stagger: 0.06, y: 0 }, "<0.08")

        return () => timeline.kill()
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([page, header, navigation, content], { autoAlpha: 1, y: 0 })
        return undefined
      })

      return () => media.revert()
    },
    { scope },
  )
}

export { useSettingsPageEntrance }
