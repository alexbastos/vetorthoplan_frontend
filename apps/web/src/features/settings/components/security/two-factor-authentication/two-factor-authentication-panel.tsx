"use client"

import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { useLoginHandoff } from "@/components/shared/login-handoff/login-handoff-provider"
import { useLogout } from "@/features/auth/hooks/use-logout"
import { useSettingsErrorMessage } from "@/features/settings/hooks/use-settings-error-message"
import { TwoFactorAuthenticationMethod } from "./two-factor-authentication-method"
import { RecoveryCodesDialog } from "./recovery-codes-dialog"
import { TwoFactorAuthenticationSetupPanel } from "./two-factor-authentication-setup-panel"
import { useTwoFactorAuthentication } from "./use-two-factor-authentication"

type TwoFactorAuthenticationPanelProps = {
  isActive: boolean
}

const MINIMUM_SESSION_REVOCATION_HANDOFF_DURATION_MS = 3_000

/**
 * MÃ³dulo raiz de autenticaÃ§Ã£o em duas etapas.
 * O fluxo visual TOTP serÃ¡ composto aqui nas prÃ³ximas etapas.
 */
function TwoFactorAuthenticationPanel({ isActive }: TwoFactorAuthenticationPanelProps) {
  const t = useTranslations("settings.twoFactorAuthentication")
  const tActions = useTranslations("common.actions")
  const getSettingsErrorMessage = useSettingsErrorMessage()
  const { beginHandoff, exitHandoff } = useLoginHandoff()
  const { completeLogout, logout } = useLogout()
  const [isCompletingSetup, setIsCompletingSetup] = useState(false)
  const {
    beginConfiguration,
    beginSetup,
    beginVerification,
    cancelSetup,
    dismissRecoveryCodes,
    isStatusLoading,
    isVerifying,
    method,
    qrCodeUrl,
    recoveryCodes,
    refreshStatus,
    setupErrorCode,
    status,
    statusErrorCode,
    verificationErrorCode,
  } = useTwoFactorAuthentication(isActive)
  const isSettingUp = status === "setting-up"
  const isSetupVisible = isSettingUp
  const isMfaEnabled = isSettingUp || status === "enabled"
  const isConfigurationVisible = !isStatusLoading && !statusErrorCode && status !== "disabled"

  const completeTwoFactorAuthenticationSetup = useCallback(() => {
    if (isCompletingSetup || !beginHandoff({
      authenticating: t("sessionRevocationTitle"),
      preparing: t("sessionRevocationRedirecting"),
      validating: t("sessionRevocationDescription"),
    })) return

    setIsCompletingSetup(true)
    dismissRecoveryCodes()

    void (async () => {
      const handoffStartedAt = performance.now()
      const logoutSucceeded = await logout({ complete: false })
      const elapsed = performance.now() - handoffStartedAt
      const remainingDuration = Math.max(0, MINIMUM_SESSION_REVOCATION_HANDOFF_DURATION_MS - elapsed)

      if (remainingDuration > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remainingDuration))
      }

      await exitHandoff()

      if (logoutSucceeded) {
        completeLogout()
        return
      }

      window.location.replace("/login")
    })()
  }, [beginHandoff, completeLogout, dismissRecoveryCodes, exitHandoff, isCompletingSetup, logout, t])

  if (!isActive) return null

  return (
    <section aria-labelledby="two-factor-authentication-title" className="border-t border-capta-border-default px-6 py-6 sm:px-8" data-settings-two-factor-authentication-group>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-ui-semibold text-capta-text-primary" id="two-factor-authentication-title">{t("title")}</h3>
          <p className="mt-1 max-w-xs text-ui text-capta-text-secondary">{t("description")}</p>
        </div>

        {!isStatusLoading && !statusErrorCode && status !== "enabled" ? (
          <Button className="!h-7 px-2 text-caption font-semibold" onClick={isConfigurationVisible ? cancelSetup : beginConfiguration} size="sm" type="button" variant="secondary">
            {isConfigurationVisible ? t("back") : t("configureAction")}
          </Button>
        ) : null}
      </div>

      {isStatusLoading ? <p className="mt-4 text-caption text-capta-text-secondary" role="status">{t("statusLoading")}</p> : null}
      {statusErrorCode ? (
        <div className="mt-4 flex items-center gap-3" role="alert">
          <p className="text-caption text-capta-feedback-danger">{getSettingsErrorMessage(statusErrorCode)}</p>
          <Button className="!h-7 px-2 text-caption font-semibold" onClick={refreshStatus} size="sm" type="button" variant="secondary">
            {tActions("retry")}
          </Button>
        </div>
      ) : null}

      {isConfigurationVisible ? (
        <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] md:items-start">
          <div>
            <TwoFactorAuthenticationMethod disabled={status === "enabled"} isEnabled={isMfaEnabled} label={method === "EMAIL" ? t("emailAuthenticator") : t("authenticatorApp")} onToggle={isSettingUp ? cancelSetup : beginSetup} statusLabel={status === "enabled" ? t("enabled") : undefined} toggleLabel={t("toggleAuthenticatorApp")} />
            {setupErrorCode ? <p className="mt-3 text-caption text-capta-feedback-danger" role="alert">{getSettingsErrorMessage(setupErrorCode)}</p> : null}
          </div>
          {isSetupVisible ? (
            <TwoFactorAuthenticationSetupPanel
              isLoading={isSettingUp && !qrCodeUrl}
              isVerifying={isVerifying}
              canRefresh={verificationErrorCode !== undefined && verificationErrorCode !== "MFA_CODE_INVALID"}
              onRefresh={beginSetup}
              onVerify={beginVerification}
              qrCodeUrl={qrCodeUrl}
              verificationError={
                verificationErrorCode
                  ? verificationErrorCode === "MFA_CODE_INVALID"
                    ? t("invalidVerificationCode")
                    : t("verificationUnavailable")
                  : undefined
              }
            />
          ) : null}
        </div>
      ) : null}
      <RecoveryCodesDialog onAcknowledge={completeTwoFactorAuthenticationSetup} recoveryCodes={recoveryCodes} />
    </section>
  )
}

export { TwoFactorAuthenticationPanel }
