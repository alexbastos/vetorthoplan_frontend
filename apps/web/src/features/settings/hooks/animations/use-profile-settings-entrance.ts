"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useRef, type RefObject } from "react"

gsap.registerPlugin(useGSAP)

/** Cascata de entrada do conteúdo carregado do Perfil. */
function useProfileSettingsEntrance(scope: RefObject<HTMLElement | null>, isReady: boolean) {
  const hasEntered = useRef(false)

  useGSAP(
    () => {
      const form = scope.current

      if (!form || !isReady || hasEntered.current) {
        return undefined
      }

      const groups = Array.from(form.querySelectorAll<HTMLElement>("[data-settings-profile-group]"))
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        hasEntered.current = true

        const timeline = gsap.timeline({ defaults: { ease: "power2.out" } })
        timeline.fromTo(groups, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, duration: 0.28, stagger: 0.07, y: 0 })

        return () => timeline.kill()
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(groups, { autoAlpha: 1, y: 0 })
        return undefined
      })

      return () => media.revert()
    },
    { dependencies: [isReady], scope },
  )
}

export { useProfileSettingsEntrance }
