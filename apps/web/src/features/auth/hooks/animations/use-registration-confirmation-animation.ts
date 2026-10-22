"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import type { RegistrationConfirmationState } from "../../components/shell/auth-transition-provider"
import { useAuthTransition } from "../../components/shell/auth-transition-provider"
import { REGISTRATION_CONFIRMATION_EXIT_DURATION, REGISTRATION_CONFIRMATION_STATUS_CHANGE_DELAY } from "../../lib/registration-confirmation"

type RegistrationConfirmationAnimationOptions = {
  state: RegistrationConfirmationState
}

gsap.registerPlugin(useGSAP)

function useRegistrationConfirmationAnimation({ state }: RegistrationConfirmationAnimationOptions) {
  const { resetRegistrationConfirmation } = useAuthTransition()

  useGSAP(
    () => {
      const loaderElement = document.querySelector("[data-auth-registration-loader]")
      const creatingStatusElement = document.querySelector("[data-auth-registration-status-creating]")
      const sentStatusElement = document.querySelector("[data-auth-registration-status-sent]")

      if (state === "loading") {
        if (!loaderElement) {
          return
        }

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.set(loaderElement, { autoAlpha: 1, y: 0 })
          gsap.set(creatingStatusElement, { autoAlpha: 0 })
          gsap.set(sentStatusElement, { autoAlpha: 1, y: 0 })
          return
        }

        const timeline = gsap.timeline({ defaults: { ease: "power2.out" } })

        gsap.set(sentStatusElement, { autoAlpha: 0, y: 2 })
        gsap.set(creatingStatusElement, { autoAlpha: 1, y: 0 })

        timeline
          .fromTo(loaderElement, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, duration: 0.32, y: 0 })
          .to(
            creatingStatusElement,
            { autoAlpha: 0, duration: 0.18, ease: "power1.in", y: -2 },
            REGISTRATION_CONFIRMATION_STATUS_CHANGE_DELAY,
          )
          .to(
            sentStatusElement,
            { autoAlpha: 1, duration: 0.2, ease: "power1.out", y: 0 },
            "<0.05",
          )

        return () => {
          timeline.kill()
        }
      }

      if (state === "navigating" && loaderElement) {
        gsap.set(loaderElement, { autoAlpha: 1, y: 0 })
      }

      if (state === "exiting" && loaderElement) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          resetRegistrationConfirmation()
          return
        }

        const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete: resetRegistrationConfirmation })

        timeline.to(loaderElement, { autoAlpha: 0, duration: REGISTRATION_CONFIRMATION_EXIT_DURATION, y: -4 })

        return () => timeline.kill()
      }
    },
    { dependencies: [resetRegistrationConfirmation, state] },
  )
}

export { useRegistrationConfirmationAnimation }
