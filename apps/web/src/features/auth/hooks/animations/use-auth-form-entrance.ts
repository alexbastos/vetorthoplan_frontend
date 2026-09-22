"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

import { useAuthTransition } from "../../components/shell/auth-transition-provider"

type AuthFormEntranceOptions = {
  delay: number
  motionId: string
  scope: RefObject<HTMLElement | null>
  stagger: number
  stepSelector: string
  y: number
}

gsap.registerPlugin(useGSAP)

function useAuthFormEntrance({ delay, motionId, scope, stagger, stepSelector, y }: AuthFormEntranceOptions) {
  const { completeTransition, registerMotion } = useAuthTransition()

  useGSAP(
    () => {
      const formRoot = scope.current
      const formContainer = formRoot?.closest<HTMLElement>("[data-auth-form]")
      const steps = Array.from(formRoot?.querySelectorAll<HTMLElement>(stepSelector) ?? [])

      if (steps.length === 0) {
        return undefined
      }

      // The shell persists while Next swaps routes. Its exit timeline fades the
      // shared form container, so the incoming form must restore that container
      // before its own child cascade starts.
      if (formContainer) {
        gsap.set(formContainer, { autoAlpha: 1, y: 0 })
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(steps, { autoAlpha: 1, y: 0 })
        completeTransition()
        return undefined
      }

      gsap.set(steps, { autoAlpha: 0, y })

      let unregisterMotion: () => void = () => {}
      const timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => {
          gsap.set(steps, { autoAlpha: 1, y: 0 })
          unregisterMotion()
          completeTransition()
        },
      })

      unregisterMotion = registerMotion(motionId, {
        cancel: () => {
          timeline.kill()
          if (formContainer) {
            gsap.set(formContainer, { autoAlpha: 1, y: 0 })
          }
          gsap.set(steps, { autoAlpha: 1, y: 0 })
        },
        settle: () => timeline.progress(1),
      })

      timeline.to(steps, {
        autoAlpha: 1,
        delay,
        duration: 0.28,
        stagger,
        y: 0,
      })

      return () => {
        timeline.kill()
        unregisterMotion()
      }
    },
    { dependencies: [completeTransition, delay, motionId, registerMotion, stagger, stepSelector, y], scope },
  )
}

export { useAuthFormEntrance }
