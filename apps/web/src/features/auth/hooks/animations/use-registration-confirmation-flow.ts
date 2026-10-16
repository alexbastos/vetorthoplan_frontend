"use client"

import gsap from "gsap"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"

import { useAuthTransition } from "../../components/shell/auth-transition-provider"
import {
  REGISTRATION_CONFIRMATION_EXIT_DURATION,
  REGISTRATION_CONFIRMATION_LOADING_DURATION,
} from "../../lib/registration-confirmation"

function useRegistrationConfirmationFlow() {
  const router = useRouter()
  const { beginRegistrationConfirmation, completeRegistrationConfirmation, registerMotion } = useAuthTransition()
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const unregisterMotionRef = useRef<(() => void) | null>(null)

  useEffect(
    () => () => {
      timelineRef.current?.kill()
      unregisterMotionRef.current?.()
    },
    [],
  )

  const startRegistrationConfirmation = useCallback(
    () => {
      if (!beginRegistrationConfirmation()) {
        return false
      }

      const targetPath = "/register/check-email"

      timelineRef.current?.kill()
      unregisterMotionRef.current?.()
      timelineRef.current = gsap
        .timeline()
        .to({}, { duration: REGISTRATION_CONFIRMATION_LOADING_DURATION })
        .call(completeRegistrationConfirmation)
        .to({}, { duration: REGISTRATION_CONFIRMATION_EXIT_DURATION })
        .call(() => {
          unregisterMotionRef.current?.()
          unregisterMotionRef.current = null
          timelineRef.current = null
          router.replace(targetPath)
        })

      unregisterMotionRef.current = registerMotion("registration-confirmation-flow", {
        cancel: () => timelineRef.current?.kill(),
        settle: () => timelineRef.current?.progress(1),
      })

      return true
    },
    [beginRegistrationConfirmation, completeRegistrationConfirmation, registerMotion, router],
  )

  return { startRegistrationConfirmation }
}

export { useRegistrationConfirmationFlow }
