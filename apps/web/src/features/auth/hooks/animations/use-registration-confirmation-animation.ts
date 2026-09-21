"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import type { RegistrationConfirmationState } from "../../components/shell/auth-transition-provider"
import {
  REGISTRATION_CONFIRMATION_EXIT_DURATION,
  REGISTRATION_CONFIRMATION_STATUS_CHANGE_DELAY,
} from "../../lib/registration-confirmation"

type RegistrationConfirmationAnimationOptions = {
  state: RegistrationConfirmationState
}

gsap.registerPlugin(useGSAP)

function useRegistrationConfirmationAnimation({ state }: RegistrationConfirmationAnimationOptions) {
  useGSAP(
    () => {
      const loaderElement = document.querySelector("[data-auth-registration-loader]")
      const backgroundElements = document.querySelectorAll("[data-auth-back], [data-auth-logo], [data-auth-flow]")
      const creatingStatusElement = document.querySelector("[data-auth-registration-status-creating]")
      const sentStatusElement = document.querySelector("[data-auth-registration-status-sent]")
      const dotElements = document.querySelectorAll("[data-auth-registration-dot]")

      if (state === "loading") {
        if (!loaderElement) {
          return
        }

        const timeline = gsap.timeline({ defaults: { ease: "power2.out" } })
        const dotsTimeline = gsap.timeline({ repeat: -1, yoyo: true })

        gsap.set(sentStatusElement, { autoAlpha: 0, y: 2 })
        gsap.set(creatingStatusElement, { autoAlpha: 1, y: 0 })

        timeline
          .to(backgroundElements, { autoAlpha: 0, duration: 0.28 })
          .fromTo(loaderElement, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, duration: 0.32, y: 0 }, "<0.12")
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

        dotsTimeline.to(dotElements, { autoAlpha: 0.35, duration: 0.28, stagger: 0.12, y: -1 })

        return () => {
          timeline.kill()
          dotsTimeline.kill()
        }
      }

      if (state === "exiting" && loaderElement) {
        const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" } })

        timeline.to(loaderElement, { autoAlpha: 0, duration: REGISTRATION_CONFIRMATION_EXIT_DURATION, y: -4 })

        return () => timeline.kill()
      }
    },
    { dependencies: [state] },
  )
}

export { useRegistrationConfirmationAnimation }
