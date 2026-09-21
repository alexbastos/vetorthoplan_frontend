"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { settingsBffClient } from "@/features/settings/services/settings-bff-client"
import type { SettingsBffErrorCode } from "@/features/settings/types/settings"

import type {
  TwoFactorAuthenticationMethod,
  TwoFactorAuthenticationStatus,
} from "./two-factor-authentication.types"

/**
 * Centraliza os estados transitÃ³rios do fluxo TOTP.
 *
 * A consulta do estado persistido e as mutaÃ§Ãµes serÃ£o adicionadas aqui quando
 * o contrato da Authentication API estiver disponÃ­vel, sem expor detalhes ao painel.
 */
function useTwoFactorAuthentication(isActive: boolean) {
  const [status, setStatus] = useState<TwoFactorAuthenticationStatus>("disabled")
  const [method, setMethod] = useState<TwoFactorAuthenticationMethod>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>()
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>()
  const [setupErrorCode, setSetupErrorCode] = useState<SettingsBffErrorCode>()
  const [verificationErrorCode, setVerificationErrorCode] = useState<SettingsBffErrorCode>()
  const [isVerifying, setIsVerifying] = useState(false)
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  const [statusErrorCode, setStatusErrorCode] = useState<SettingsBffErrorCode>()
  const isStartingSetupRef = useRef(false)
  const setupAttemptRef = useRef(0)
  const wasActiveRef = useRef(false)
  const [statusRequestVersion, setStatusRequestVersion] = useState(0)

  useEffect(() => {
    if (!isActive) {
      wasActiveRef.current = false
      return
    }

    if (wasActiveRef.current) return

    wasActiveRef.current = true
    let isCurrent = true
    setIsStatusLoading(true)
    setStatusErrorCode(undefined)

    void settingsBffClient.getTwoFactorAuthenticationStatus().then((result) => {
      if (!isCurrent) return

      if (!result.ok) {
        setStatusErrorCode(result.error.code)
        setIsStatusLoading(false)
        return
      }

      setMethod(result.data.method)
      setStatus(result.data.enabled ? "enabled" : "disabled")
      setIsStatusLoading(false)
    })

    return () => {
      isCurrent = false
    }
  }, [isActive, statusRequestVersion])

  const refreshStatus = useCallback(() => {
    wasActiveRef.current = false
    setStatusRequestVersion((version) => version + 1)
  }, [])

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
    setQrCodeUrl(undefined)
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
      setMethod("TOTP")
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
    isStatusLoading,
    method,
    qrCodeUrl,
    recoveryCodes,
    refreshStatus,
    setupErrorCode,
    statusErrorCode,
    status,
    verificationErrorCode,
  }
}

export { useTwoFactorAuthentication }
