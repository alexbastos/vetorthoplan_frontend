"use client"

import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { useSettingsErrorMessage } from "@/features/settings/hooks/use-settings-error-message"
import { TwoFactorAuthenticationMethod } from "./two-factor-authentication-method"
import { RecoveryCodesDialog } from "./recovery-codes-dialog"
import { TwoFactorAuthenticationSetupPanel } from "./two-factor-authentication-setup-panel"
import { useTwoFactorAuthentication } from "./use-two-factor-authentication"

type TwoFactorAuthenticationPanelProps = {
  isActive: boolean
}

/**
 * MÃ³dulo raiz de autenticaÃ§Ã£o em duas etapas.
 * O fluxo visual TOTP serÃ¡ composto aqui nas prÃ³ximas etapas.
 */
function TwoFactorAuthenticationPanel({ isActive }: TwoFactorAuthenticationPanelProps) {
  const t = useTranslations("settings.twoFactorAuthentication")
  const getSettingsErrorMessage = useSettingsErrorMessage()
  const {
    beginConfiguration,
    beginSetup,
    beginVerification,
    cancelSetup,
    dismissRecoveryCodes,
    isVerifying,
    qrCodeUrl,
    recoveryCodes,
    setupErrorCode,
    status,
    verificationErrorCode,
  } = useTwoFactorAuthentication()
  const isSettingUp = status === "setting-up"
  const isSetupVisible = isSettingUp
  const isTotpEnabled = isSettingUp || status === "enabled"
  const isConfigurationVisible = status !== "disabled"

  if (!isActive) return null

  return (
    <section aria-labelledby="two-factor-authentication-title" className="border-t border-capta-border-default px-6 py-6 sm:px-8" data-settings-two-factor-authentication-group>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-ui-semibold text-capta-text-primary" id="two-factor-authentication-title">{t("title")}</h3>
          <p className="mt-1 max-w-xs text-ui text-capta-text-secondary">{t("description")}</p>
        </div>

        {status !== "enabled" ? (
          <Button className="!h-7 px-2 text-caption font-semibold" onClick={isConfigurationVisible ? cancelSetup : beginConfiguration} size="sm" type="button" variant="secondary">
            {isConfigurationVisible ? t("back") : t("configureAction")}
          </Button>
        ) : null}
      </div>

      {isConfigurationVisible ? (
        <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] md:items-start">
          <div>
            <TwoFactorAuthenticationMethod disabled={status === "enabled"} isEnabled={isTotpEnabled} label={t("authenticatorApp")} onToggle={isSettingUp ? cancelSetup : beginSetup} toggleLabel={t("toggleAuthenticatorApp")} />
            {setupErrorCode ? <p className="mt-3 text-caption text-capta-feedback-danger" role="alert">{getSettingsErrorMessage(setupErrorCode)}</p> : null}
          </div>
          {isSetupVisible ? (
            <TwoFactorAuthenticationSetupPanel
              isLoading={isSettingUp && !qrCodeUrl}
              isVerifying={isVerifying}
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
      <RecoveryCodesDialog onClose={dismissRecoveryCodes} recoveryCodes={recoveryCodes} />
    </section>
  )
}

export { TwoFactorAuthenticationPanel }
