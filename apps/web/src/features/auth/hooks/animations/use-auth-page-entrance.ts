"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

import { useAuthTransition } from "../../components/shell/auth-transition-provider"

gsap.registerPlugin(useGSAP)

function useAuthPageEntrance(scope: RefObject<HTMLElement | null>, onComplete: () => void) {
  const { registerMotion } = useAuthTransition()

  useGSAP(
    () => {
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        let unregisterMotion: () => void = () => {}
        let hasCompleted = false
        const complete = () => {
          if (hasCompleted) {
            return
          }

          hasCompleted = true
          unregisterMotion()
          onComplete()
        }
        const timeline = gsap.timeline({ defaults: { ease: "power2.out" }, onComplete: complete })

        unregisterMotion = registerMotion("shell-entrance", {
          cancel: () => timeline.kill(),
          settle: () => timeline.progress(1),
        })

        timeline
          .fromTo("[data-auth-stage]", { autoAlpha: 0, scale: 0.985, y: 14 }, { autoAlpha: 1, duration: 0.45, ease: "power3.out", scale: 1, y: 0 })
          .fromTo("[data-auth-back]", { autoAlpha: 0, x: -14 }, { autoAlpha: 1, duration: 0.4, x: 0 }, "<0.12")
          .fromTo("[data-auth-stage-bg], [data-auth-panel-bg]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, "<0.05")
          .fromTo("[data-auth-logo]", { autoAlpha: 0, y: -8 }, { autoAlpha: 1, duration: 0.35, y: 0 }, "<0.1")
          .fromTo("[data-auth-source]", { autoAlpha: 0, x: -12 }, { autoAlpha: 1, duration: 0.35, x: 0 }, "<0.08")
          .fromTo("[data-auth-showcase]", { autoAlpha: 0, x: 16, y: 8 }, { autoAlpha: 1, duration: 0.45, x: 0, y: 0 }, "<0.1")
          .fromTo("[data-auth-tagline]", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, duration: 0.35, y: 0 }, "<0.1")

        return () => {
          timeline.kill()
          unregisterMotion()
        }
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        onComplete()
        return undefined
      })

      return () => media.revert()
    },
    { dependencies: [onComplete, registerMotion], scope },
  )
}

export { useAuthPageEntrance }
