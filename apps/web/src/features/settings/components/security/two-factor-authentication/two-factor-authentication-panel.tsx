"use client"

import { CircleCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { useLoginHandoff } from "@/components/shared/login-handoff/login-handoff-provider"
import { useLogout } from "@/features/auth/hooks/use-logout"
import { useSettingsErrorMessage } from "@/features/settings/hooks/use-settings-error-message"
import { RecoveryCodesDialog } from "./recovery-codes-dialog"
import { TwoFactorAuthenticationSetupDialog } from "./two-factor-authentication-setup-dialog"
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
    beginSetup,
    beginVerification,
    cancelSetup,
    dismissRecoveryCodes,
    isStatusLoading,
    isVerifying,
    qrCodeUrl,
    recoveryCodes,
    refreshStatus,
    setupErrorCode,
    status,
    statusErrorCode,
    verificationErrorCode,
  } = useTwoFactorAuthentication(isActive)
  const isSettingUp = status === "setting-up"
  const isConfigurationDialogOpen = status === "configuring" || isSettingUp
  const isMfaEnabled = status === "enabled"

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
    <section aria-labelledby="two-factor-authentication-title" className="border-t border-border px-6 py-6 sm:px-8 sm:py-7" data-settings-two-factor-authentication-group>
      <div className="flex min-h-9 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-ui-semibold text-foreground" id="two-factor-authentication-title">{t("title")}</h2>
          <p className="mt-1 max-w-xl text-ui text-description">{t("description")}</p>
        </div>

        {!isStatusLoading && !statusErrorCode && !isMfaEnabled ? (
          <TwoFactorAuthenticationSetupDialog
            canRefresh={verificationErrorCode !== undefined && verificationErrorCode !== "MFA_CODE_INVALID"}
            isLoading={isSettingUp && !qrCodeUrl}
            isOpen={isConfigurationDialogOpen}
            isVerifying={isVerifying}
            onOpenChange={(open) => {
              if (open) {
                void beginSetup()
                return
              }

              if (!isVerifying) cancelSetup()
            }}
            onRefresh={beginSetup}
            onRetry={beginSetup}
            onVerify={beginVerification}
            qrCodeUrl={qrCodeUrl}
            setupError={setupErrorCode ? getSettingsErrorMessage(setupErrorCode) : undefined}
            verificationError={
              verificationErrorCode
                ? verificationErrorCode === "MFA_CODE_INVALID"
                  ? t("invalidVerificationCode")
                  : t("verificationUnavailable")
                : undefined
            }
          />
        ) : isMfaEnabled ? (
          <span className="inline-flex min-h-9 items-center gap-2 text-caption font-medium text-success capitalize" role="status">
            <CircleCheck aria-hidden="true" className="size-4" />
            {t("enabled")}
          </span>
        ) : null}
      </div>

      {isStatusLoading ? <p className="mt-4 text-caption text-content-secondary" role="status">{t("statusLoading")}</p> : null}
      {statusErrorCode ? (
        <div className="mt-4 flex items-center gap-3" role="alert">
          <p className="text-caption text-destructive">{getSettingsErrorMessage(statusErrorCode)}</p>
          <Button onClick={refreshStatus} size="sm" type="button" variant="secondary">
            {tActions("retry")}
          </Button>
        </div>
      ) : null}

      <RecoveryCodesDialog onAcknowledge={completeTwoFactorAuthenticationSetup} recoveryCodes={recoveryCodes} />
    </section>
  )
}

export { TwoFactorAuthenticationPanel }
