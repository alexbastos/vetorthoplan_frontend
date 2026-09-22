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
      const select = gsap.utils.selector(scope)
      const stageBackground = select("[data-auth-stage-bg]")
      const back = select("[data-auth-back]")
      const logo = select("[data-auth-logo]")
      const footer = select("[data-auth-footer]")
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
          .fromTo(stageBackground, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 })
          .fromTo(logo, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, duration: 0.35, y: 0 }, "<0.1")
          .fromTo(back, { autoAlpha: 0, x: -14 }, { autoAlpha: 1, duration: 0.4, x: 0 }, "<0.12")
          .fromTo(footer, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, duration: 0.32, y: 0 }, "<0.08")

        return () => {
          timeline.kill()
          unregisterMotion()
        }
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(stageBackground, { autoAlpha: 1 })
        gsap.set(back, { autoAlpha: 1, x: 0, y: 0 })
        gsap.set(logo, { autoAlpha: 1, x: 0, y: 0 })
        gsap.set(footer, { autoAlpha: 1, x: 0, y: 0 })
        onComplete()
        return undefined
      })

      return () => media.revert()
    },
    { dependencies: [onComplete, registerMotion], scope },
  )
}

export { useAuthPageEntrance }
