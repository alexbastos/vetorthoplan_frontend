"use client"

import { useCallback, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { useMfaLoginChallengeContext } from "../components/forms/mfa-login-challenge-provider"
import { authBffClient } from "../services/auth-bff-client"

const GOOGLE_IDENTITY_SERVICES_URL = "https://accounts.google.com/gsi/client"
const GOOGLE_SCOPE = "openid email profile"

let googleIdentityServicesPromise: Promise<void> | undefined

class GooglePopupError extends Error {
  constructor(readonly type: string) {
    super(type)
    this.name = "GooglePopupError"
  }
}

function useGoogleAuth() {
  const t = useTranslations("auth.notifications")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { authenticate } = useMfaLoginChallengeContext()

  const signIn = useCallback(async () => {
    if (isSubmitting) {
      return
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
      toast.error(t("googleUnavailable.title"), {
        description: t("googleUnavailable.description"),
      })
      return
    }

    setIsSubmitting(true)

    try {
      await loadGoogleIdentityServices()
      const token = await requestGoogleAccessToken(clientId)

      await authenticate(() =>
        authBffClient.socialLogin({ provider: "GOOGLE", token }),
      )
    } catch (error) {
      if (isGooglePopupClosedError(error)) {
        return
      }

      toast.error(t("socialAuthFailed.title"), {
        description: t("genericLogin.description"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [authenticate, isSubmitting, t])

  return { isSubmitting, signIn }
}

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts.oauth2) {
    return Promise.resolve()
  }

  googleIdentityServicesPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.async = true
    script.src = GOOGLE_IDENTITY_SERVICES_URL
    script.onload = () => (window.google?.accounts.oauth2 ? resolve() : reject())
    script.onerror = () => reject()
    document.head.append(script)
  })

  return googleIdentityServicesPromise
}

function requestGoogleAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      callback: (response) => {
        if (!response.access_token || response.error) {
          reject()
          return
        }

        resolve(response.access_token)
      },
      client_id: clientId,
      error_callback: (error) => reject(new GooglePopupError(error.type)),
      scope: GOOGLE_SCOPE,
    })

    if (!tokenClient) {
      reject()
      return
    }

    tokenClient.requestAccessToken({ prompt: "select_account" })
  })
}

function isGooglePopupClosedError(error: unknown): error is GooglePopupError {
  return error instanceof GooglePopupError && error.type === "popup_closed"
}

export { useGoogleAuth }
