"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

import { useAuthTransition } from "../../components/shell/auth-transition-provider"

gsap.registerPlugin(useGSAP)

function useEmailVerificationSentEntrance(scope: RefObject<HTMLElement | null>) {
  const { registerMotion, resetRegistrationConfirmation } = useAuthTransition()

  useGSAP(
    () => {
      const flowElement = document.querySelector("[data-auth-flow]")

      if (flowElement) {
        gsap.set(flowElement, { autoAlpha: 1 })
      }

      resetRegistrationConfirmation()

      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const formContainer = document.querySelector("[data-auth-form]")
        if (formContainer) {
          gsap.set(formContainer, { autoAlpha: 0, y: 12 })
        }

        const steps = gsap.utils.toArray<HTMLElement>("[data-email-verification-step]")
        gsap.set(steps, { autoAlpha: 0, y: 12 })

        if (formContainer) {
          gsap.set(formContainer, { autoAlpha: 1, y: 0 })
        }

        let unregisterMotion: () => void = () => {}
        const timeline = gsap.timeline({
          defaults: { ease: "power2.out" },
          onComplete: () => unregisterMotion(),
        })

        unregisterMotion = registerMotion("email-verification-sent-entrance", {
          cancel: () => timeline.kill(),
          settle: () => timeline.progress(1),
        })

        timeline.to(steps, {
          autoAlpha: 1,
          delay: 0.15,
          duration: 0.28,
          stagger: 0.06,
          y: 0,
        })

        return () => {
          timeline.kill()
          unregisterMotion()
        }
      })

      return () => media.revert()
    },
    { dependencies: [registerMotion, resetRegistrationConfirmation], scope },
  )
}

export { useEmailVerificationSentEntrance }
