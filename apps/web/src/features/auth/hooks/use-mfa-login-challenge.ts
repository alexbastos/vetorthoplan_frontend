"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  getSafeAuthRedirect,
  isOAuthAuthorizationRedirect,
} from "../lib/get-safe-auth-redirect"
import { isValidMfaCode } from "../lib/mfa-challenge"
import { authBffClient } from "../services/auth-bff-client"
import type { AuthBffError, AuthBffResult, LoginOutcome, MfaMethod } from "../types/auth"
import { useAuthErrorNotification } from "./use-auth-error-notification"
import { useLoginAuthenticationFlow } from "./use-login-authentication-flow"

type MfaCodeValues = {
  code: string
}

type FirstFactorRequest = () => Promise<AuthBffResult<LoginOutcome>>

const EMAIL_CODE_COOLDOWN_SECONDS = 60
const TERMINAL_MFA_ERRORS = new Set<AuthBffError["code"]>([
  "ACCOUNT_REQUIRES_ACTION",
  "MFA_ATTEMPTS_EXCEEDED",
  "MFA_CHALLENGE_EXPIRED",
  "MFA_CHALLENGE_INVALID",
  "MFA_METHOD_NOT_ALLOWED",
])

// O token MFA permanece em uma referência privada, fora do contexto React.
function useMfaLoginChallenge(redirectTo: string | undefined) {
  const tMfa = useTranslations("auth.mfa")
  const tNotifications = useTranslations("auth.notifications")
  const getAuthErrorNotification = useAuthErrorNotification()
  const router = useRouter()
  const form = useForm<MfaCodeValues>({ defaultValues: { code: "" } })
  const [availableMethods, setAvailableMethods] = useState<MfaMethod[]>()
  const [method, setMethod] = useState<MfaMethod>()
  const [emailCooldownEndsAt, setEmailCooldownEndsAt] = useState<number>()
  const [emailCooldownSeconds, setEmailCooldownSeconds] = useState(0)
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const activeChallengeTokenRef = useRef<string | undefined>(undefined)
  const isMountedRef = useRef(true)
  const { awaitDestination, finishAuthentication, runAuthentication } = useLoginAuthenticationFlow()

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      activeChallengeTokenRef.current = undefined
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!emailCooldownEndsAt) return undefined

    const updateRemainingTime = () => {
      const seconds = Math.max(0, Math.ceil((emailCooldownEndsAt - Date.now()) / 1_000))
      setEmailCooldownSeconds(seconds)

      if (seconds === 0) setEmailCooldownEndsAt(undefined)
    }

    updateRemainingTime()
    const interval = window.setInterval(updateRemainingTime, 1_000)
    return () => window.clearInterval(interval)
  }, [emailCooldownEndsAt])

  const discardChallenge = useCallback(() => {
    activeChallengeTokenRef.current = undefined
    setAvailableMethods(undefined)
    setMethod(undefined)
    setEmailCooldownEndsAt(undefined)
    setEmailCooldownSeconds(0)
    setIsSendingEmailCode(false)
    setIsVerifying(false)
    form.reset()
  }, [form])

  const completeAuthentication = useCallback(() => {
    discardChallenge()
    awaitDestination()
    const destination = getSafeAuthRedirect(redirectTo)

    if (isOAuthAuthorizationRedirect(destination)) {
      window.location.replace(destination)
      return
    }

    router.replace(destination)
  }, [awaitDestination, discardChallenge, redirectTo, router])

  const notifyError = useCallback((error: AuthBffError) => {
    const notification = getAuthErrorNotification(error)
    toast.error(notification.title, { description: notification.description })
  }, [getAuthErrorNotification])

  const notifyUnexpectedError = useCallback(() => {
    toast.error(tNotifications("genericLogin.title"), { description: tNotifications("genericLogin.description") })
  }, [tNotifications])

  const finishAuthenticationAttempt = useCallback(async () => {
    await finishAuthentication()
    return isMountedRef.current
  }, [finishAuthentication])

  const resolveAuthentication = useCallback(async (outcome: LoginOutcome) => {
    if (outcome.type === "authenticated") {
      completeAuthentication()
      return true
    }

    if (!await finishAuthenticationAttempt()) return false

    discardChallenge()
    activeChallengeTokenRef.current = outcome.challengeToken
    setAvailableMethods(outcome.availableMethods)
    setMethod(outcome.availableMethods[0])
    return true
  }, [completeAuthentication, discardChallenge, finishAuthenticationAttempt])

  const authenticate = useCallback(async (requestFirstFactor: FirstFactorRequest) => {
    const request = await runAuthentication(requestFirstFactor)

    if (!isMountedRef.current) {
      void finishAuthentication()
      return undefined
    }

    if (request.type === "cancelled") return undefined

    if (request.type === "error") {
      if (!await finishAuthenticationAttempt()) return undefined
      notifyUnexpectedError()
      return undefined
    }

    if (!request.result.ok) {
      if (!await finishAuthenticationAttempt()) return undefined
      notifyError(request.result.error)
      return undefined
    }

    const resultType = request.result.data.type
    const wasResolved = await resolveAuthentication(request.result.data)
    return wasResolved ? resultType : undefined
  }, [finishAuthentication, finishAuthenticationAttempt, notifyError, notifyUnexpectedError, resolveAuthentication, runAuthentication])

  const selectMethod = useCallback((nextMethod: MfaMethod) => {
    if (!availableMethods?.includes(nextMethod)) return
    setMethod(nextMethod)
    form.reset()
  }, [availableMethods, form])

  const verify = form.handleSubmit(async ({ code }) => {
    const selectedMethod = method
    const challengeToken = activeChallengeTokenRef.current

    if (!challengeToken || !selectedMethod || isVerifying) return

    if (!isValidMfaCode(code, selectedMethod)) {
      form.setError(
        "code",
        { message: tMfa(selectedMethod === "RECOVERY" ? "errors.invalidRecoveryCode" : "errors.invalidOneTimeCode") },
        { shouldFocus: true },
      )
      return
    }

    setIsVerifying(true)

    const request = await runAuthentication(() => authBffClient.verifyMfa({
      challengeToken,
      code,
      method: selectedMethod,
    }))

    if (activeChallengeTokenRef.current !== challengeToken) return

    setIsVerifying(false)

    if (request.type === "cancelled") return

    if (request.type === "error") {
      if (!await finishAuthenticationAttempt()) return
      notifyUnexpectedError()
      return
    }

    if (!request.result.ok) {
      if (!await finishAuthenticationAttempt()) return

      if (request.result.error.code === "MFA_CODE_INVALID") {
        form.setError("code", { message: tMfa("errors.invalidCode") }, { shouldFocus: true })
        return
      }

      notifyError(request.result.error)
      if (TERMINAL_MFA_ERRORS.has(request.result.error.code)) discardChallenge()
      return
    }

    completeAuthentication()
  })

  const sendEmailCode = useCallback(async () => {
    const challengeToken = activeChallengeTokenRef.current

    if (!challengeToken || !availableMethods?.includes("EMAIL") || emailCooldownSeconds > 0 || isSendingEmailCode) return

    setIsSendingEmailCode(true)

    const result = await authBffClient.sendMfaEmailCode({ challengeToken })

    if (activeChallengeTokenRef.current !== challengeToken) return

    setIsSendingEmailCode(false)

    if (!result.ok) {
      if (result.error.code === "RATE_LIMITED") {
        setEmailCooldownEndsAt(Date.now() + EMAIL_CODE_COOLDOWN_SECONDS * 1_000)
      }
      notifyError(result.error)
      if (TERMINAL_MFA_ERRORS.has(result.error.code)) discardChallenge()
      return
    }

    setEmailCooldownEndsAt(Date.now() + EMAIL_CODE_COOLDOWN_SECONDS * 1_000)
    toast.success(tMfa("emailSent.title"), { description: tMfa("emailSent.description") })
  }, [availableMethods, discardChallenge, emailCooldownSeconds, isSendingEmailCode, notifyError, tMfa])

  return {
    authenticate,
    availableMethods,
    discardChallenge,
    emailCooldownSeconds,
    form,
    isSendingEmailCode,
    isChallengeActive: Boolean(availableMethods && method),
    isVerifying,
    method: method ?? availableMethods?.[0],
    selectMethod,
    sendEmailCode,
    verify,
  }
}

export { useMfaLoginChallenge }
export type { MfaCodeValues }
