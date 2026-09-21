"use client"

import gsap from "gsap"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  EMAIL_VERIFICATION_CONFIRMING_MIN_DURATION,
  EMAIL_VERIFICATION_CONFIRMED_DURATION,
  EMAIL_VERIFICATION_EXIT_DURATION,
  EMAIL_VERIFICATION_LOADING_REVEAL_DELAY,
} from "../lib/email-verification"
import { authBffClient } from "../services/auth-bff-client"

type EmailVerificationState = "resolving" | "confirming" | "confirmed" | "exiting" | "invalid-link" | "unavailable"

function useVerifyEmail(token: string | undefined) {
  const router = useRouter()
  const [state, setState] = useState<EmailVerificationState>("resolving")
  const hasStartedForTokenRef = useRef<string | undefined | null>(null)
  const requestIdRef = useRef(0)
  const completionTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const loaderRevealDelayRef = useRef<gsap.core.Tween | null>(null)
  const verificationStartedAtRef = useRef<number | null>(null)

  const completeAndRedirect = useCallback(
    (verificationStartedAt: number) => {
      const elapsedDuration = (Date.now() - verificationStartedAt) / 1_000
      const confirmingDuration = Math.max(0, EMAIL_VERIFICATION_CONFIRMING_MIN_DURATION - elapsedDuration)

      completionTimelineRef.current?.kill()
      completionTimelineRef.current = gsap
        .timeline()
        .to({}, { duration: confirmingDuration })
        .call(() => setState("confirmed"))
        .to({}, { duration: EMAIL_VERIFICATION_CONFIRMED_DURATION })
        .call(() => setState("exiting"))
        .to({}, { duration: EMAIL_VERIFICATION_EXIT_DURATION })
        .call(() => router.replace("/login?verified=1"))
    },
    [router],
  )

  const verifyEmail = useCallback(async () => {
    const normalizedToken = token?.trim()

    if (!normalizedToken) {
      setState("invalid-link")
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    completionTimelineRef.current?.kill()
    loaderRevealDelayRef.current?.kill()
    verificationStartedAtRef.current = Date.now()
    setState("resolving")
    loaderRevealDelayRef.current = gsap.delayedCall(EMAIL_VERIFICATION_LOADING_REVEAL_DELAY, () => {
      setState("confirming")
    })

    const result = await authBffClient.verifyEmail({ token: normalizedToken })

    if (requestId !== requestIdRef.current) {
      return
    }

    loaderRevealDelayRef.current?.kill()

    if (!result.ok) {
      setState(result.error.code === "INVALID_VERIFICATION_LINK" ? "invalid-link" : "unavailable")
      return
    }

    setState("confirming")
    completeAndRedirect(verificationStartedAtRef.current)
  }, [completeAndRedirect, token])

  useEffect(() => {
    if (hasStartedForTokenRef.current === token) {
      return
    }

    hasStartedForTokenRef.current = token
    void verifyEmail()
  }, [token, verifyEmail])

  useEffect(
    () => () => {
      completionTimelineRef.current?.kill()
      loaderRevealDelayRef.current?.kill()
    },
    [],
  )

  return { retry: verifyEmail, state }
}

export { useVerifyEmail }
export type { EmailVerificationState }
