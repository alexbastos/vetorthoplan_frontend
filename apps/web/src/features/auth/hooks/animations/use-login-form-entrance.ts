"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

import { useAuthTransition } from "../../components/shell/auth-transition-provider"

gsap.registerPlugin(useGSAP)

function useLoginFormEntrance(scope?: RefObject<HTMLElement | null>) {
  const { completeTransition, registerMotion } = useAuthTransition()

  useGSAP(
    () => {
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const formContainer = document.querySelector("[data-auth-form]")
        if (formContainer) {
          gsap.set(formContainer, { autoAlpha: 0, y: 10 })
        }

        const steps = gsap.utils.toArray<HTMLElement>("[data-login-step]")
        gsap.set(steps, { autoAlpha: 0, y: 10 })

        if (formContainer) {
          gsap.set(formContainer, { autoAlpha: 1, y: 0 })
        }

        let unregisterMotion: () => void = () => {}
        const stepsTimeline = gsap.timeline({
          defaults: { ease: "power2.out" },
          onComplete: () => {
            unregisterMotion()
            completeTransition()
          },
        })

        unregisterMotion = registerMotion("login-form-entrance", {
          cancel: () => stepsTimeline.kill(),
          settle: () => stepsTimeline.progress(1),
        })

        stepsTimeline.to(steps, {
          autoAlpha: 1,
          delay: 0.02,
          duration: 0.28,
          stagger: 0.05,
          y: 0,
        })

        return () => {
          stepsTimeline.kill()
          unregisterMotion()
        }
      })

      return () => media.revert()
    },
    { dependencies: [completeTransition, registerMotion], scope },
  )
}

export { useLoginFormEntrance }
