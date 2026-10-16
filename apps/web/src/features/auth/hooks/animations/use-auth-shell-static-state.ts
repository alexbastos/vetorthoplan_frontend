"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { applyAuthShellFinalState, positionAuthLogoForVisualMode } from "../../components/shell/auth-motion-state"
import type { AuthTransitionPhase, AuthVisualMode } from "../../components/shell/auth-transition-provider"

type AuthShellStaticState = {
  hasEntered: boolean
  phase: AuthTransitionPhase
  visualMode: AuthVisualMode
}

gsap.registerPlugin(useGSAP)

function useAuthShellStaticState({ hasEntered, phase, visualMode }: AuthShellStaticState) {
  useGSAP(
    () => {
      if (phase !== "navigating") {
        positionAuthLogoForVisualMode(visualMode)
      }

      if (!hasEntered || phase === "exiting" || phase === "navigating") {
        return
      }

      applyAuthShellFinalState(visualMode)
    },
    { dependencies: [hasEntered, phase, visualMode] },
  )
}

export { useAuthShellStaticState }
