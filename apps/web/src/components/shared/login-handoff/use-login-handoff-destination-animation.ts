"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { RefObject } from "react"

import { useLoginHandoff } from "./login-handoff-provider"

gsap.registerPlugin(useGSAP)

function useLoginHandoffDestinationAnimation(
  destinationRef: RefObject<HTMLElement | null>,
) {
  const {
    completeDestinationTransition,
    destinationPhase,
    markDestinationReady,
  } = useLoginHandoff()

  useGSAP(
    () => {
      const destination = destinationRef.current

      if (!destination || destinationPhase === "inactive") {
        return undefined
      }

      if (destinationPhase === "waiting") {
        gsap.set(destination, { autoAlpha: 0, y: 6 })
        markDestinationReady()
        return undefined
      }

      if (destinationPhase === "exiting") {
        gsap.set(destination, { autoAlpha: 0, y: 6 })
        return undefined
      }

      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const entrance = gsap.fromTo(
          destination,
          { autoAlpha: 0, y: 6 },
          {
            autoAlpha: 1,
            duration: 0.4,
            ease: "power3.out",
            onComplete: completeDestinationTransition,
            y: 0,
          },
        )

        return () => entrance.kill()
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(destination, { autoAlpha: 1, y: 0 })
        completeDestinationTransition()
      })

      return () => media.revert()
    },
    {
      dependencies: [completeDestinationTransition, destinationPhase, markDestinationReady],
      revertOnUpdate: true,
      scope: destinationRef,
    },
  )
}

export { useLoginHandoffDestinationAnimation }
