"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

import { useAuthTransition } from "../../components/shell/auth-transition-provider"
import type { EmailVerificationState } from "../use-verify-email"
import { EMAIL_VERIFICATION_EXIT_DURATION } from "../../lib/email-verification"

type EmailVerificationHandlerEntranceOptions = {
  scope: RefObject<HTMLElement | null>
  state: EmailVerificationState
}

gsap.registerPlugin(useGSAP)

function useEmailVerificationHandlerEntrance({ scope, state }: EmailVerificationHandlerEntranceOptions) {
  const { registerMotion } = useAuthTransition()

  useGSAP(
    () => {
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        if (state === "resolving") {
          return undefined
        }

        if (state === "exiting") {
          return gsap.to(scope.current, {
            autoAlpha: 0,
            duration: EMAIL_VERIFICATION_EXIT_DURATION,
            ease: "power2.inOut",
            y: -4,
          })
        }

        const steps = gsap.utils.toArray<HTMLElement>("[data-email-verification-handler-step]")

        let unregisterMotion: () => void = () => {}
        const timeline = gsap.fromTo(
          steps,
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            duration: 0.24,
            ease: "power2.out",
            onComplete: () => unregisterMotion(),
            stagger: 0.05,
            y: 0,
          },
        )

        unregisterMotion = registerMotion("email-verification-handler-entrance", {
          cancel: () => timeline.kill(),
          settle: () => timeline.progress(1),
        })

        return () => {
          timeline.kill()
          unregisterMotion()
        }
      })

      return () => media.revert()
    },
    { dependencies: [registerMotion, state], scope },
  )
}

export { useEmailVerificationHandlerEntrance }
