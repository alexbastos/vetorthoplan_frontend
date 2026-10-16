"use client"

import { useCallback, useRef, useState } from "react"

import { settingsBffClient } from "@/features/settings/services/settings-bff-client"
import type { SettingsBffErrorCode } from "@/features/settings/types/settings"

import type { TwoFactorAuthenticationStatus } from "./two-factor-authentication.types"

/**
 * Centraliza os estados transitÃ³rios do fluxo TOTP.
 *
 * A consulta do estado persistido e as mutaÃ§Ãµes serÃ£o adicionadas aqui quando
 * o contrato da Authentication API estiver disponÃ­vel, sem expor detalhes ao painel.
 */
function useTwoFactorAuthentication() {
  const [status, setStatus] = useState<TwoFactorAuthenticationStatus>("disabled")
  const [qrCodeUrl, setQrCodeUrl] = useState<string>()
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>()
  const [setupErrorCode, setSetupErrorCode] = useState<SettingsBffErrorCode>()
  const [verificationErrorCode, setVerificationErrorCode] = useState<SettingsBffErrorCode>()
  const [isVerifying, setIsVerifying] = useState(false)
  const isStartingSetupRef = useRef(false)
  const setupAttemptRef = useRef(0)

  const beginConfiguration = useCallback(() => {
    setupAttemptRef.current += 1
    setQrCodeUrl(undefined)
    setRecoveryCodes(undefined)
    setSetupErrorCode(undefined)
    setVerificationErrorCode(undefined)
    setStatus("configuring")
  }, [])

  const beginSetup = useCallback(async () => {
    if (isStartingSetupRef.current) return

    isStartingSetupRef.current = true
    const attempt = setupAttemptRef.current + 1
    setupAttemptRef.current = attempt
    setSetupErrorCode(undefined)
    setVerificationErrorCode(undefined)
    setStatus("setting-up")

    try {
      const result = await settingsBffClient.beginTotpSetup()

      if (setupAttemptRef.current !== attempt) return

      if (!result.ok) {
        setQrCodeUrl(undefined)
        setSetupErrorCode(result.error.code)
        setStatus("configuring")
        return
      }

      setQrCodeUrl(result.data.qrCodeUrl)
    } finally {
      isStartingSetupRef.current = false
    }
  }, [])

  const beginVerification = useCallback(async (code: string) => {
    if (isVerifying || !/^\d{6}$/.test(code)) return

    const attempt = setupAttemptRef.current
    setVerificationErrorCode(undefined)
    setIsVerifying(true)

    try {
      const result = await settingsBffClient.verifyTotpSetup(code)

      if (setupAttemptRef.current !== attempt) return

      if (!result.ok) {
        setVerificationErrorCode(result.error.code)
        return
      }

      setQrCodeUrl(undefined)
      setRecoveryCodes(result.data.recoveryCodes)
      setStatus("enabled")
    } finally {
      setIsVerifying(false)
    }
  }, [isVerifying])

  const cancelSetup = useCallback(() => {
    setupAttemptRef.current += 1
    setQrCodeUrl(undefined)
    setRecoveryCodes(undefined)
    setSetupErrorCode(undefined)
    setVerificationErrorCode(undefined)
    setStatus("disabled")
  }, [])
  const dismissRecoveryCodes = useCallback(() => setRecoveryCodes(undefined), [])
  const markEnabled = useCallback(() => setStatus("enabled"), [])
  const markDisabled = useCallback(() => setStatus("disabled"), [])

  return {
    beginConfiguration,
    beginSetup,
    beginVerification,
    cancelSetup,
    dismissRecoveryCodes,
    markDisabled,
    markEnabled,
    isVerifying,
    qrCodeUrl,
    recoveryCodes,
    setupErrorCode,
    status,
    verificationErrorCode,
  }
}

export { useTwoFactorAuthentication }
