"use client"

import { ShieldCheck, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dialog } from "radix-ui"

import { Button } from "@/components/ui/button"

import { TwoFactorAuthenticationSetupPanel } from "./two-factor-authentication-setup-panel"

type TwoFactorAuthenticationSetupDialogProps = {
  canRefresh: boolean
  isLoading: boolean
  isOpen: boolean
  isVerifying: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => Promise<void>
  onRetry: () => Promise<void>
  onVerify: (code: string) => Promise<void>
  qrCodeUrl?: string
  setupError?: string
  verificationError?: string
}

function TwoFactorAuthenticationSetupDialog({
  canRefresh,
  isLoading,
  isOpen,
  isVerifying,
  onOpenChange,
  onRefresh,
  onRetry,
  onVerify,
  qrCodeUrl,
  setupError,
  verificationError,
}: TwoFactorAuthenticationSetupDialogProps) {
  const t = useTranslations("settings.twoFactorAuthentication")
  const tActions = useTranslations("common.actions")

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={isOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" type="button" variant="secondary">
          <ShieldCheck aria-hidden="true" />
          {t("configureAction")}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--card-composite-radius)] border border-[var(--card-composite-border)] bg-[var(--color-surface-card)] shadow-[var(--card-composite-shadow-footer)] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          onEscapeKeyDown={(event) => {
            if (isVerifying) event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (isVerifying) event.preventDefault()
          }}
        >
          <header className="relative px-6 pt-5 pb-3 text-center sm:px-8 sm:pt-6">
            <Dialog.Close asChild>
              <button
                aria-label={tActions("close")}
                className="absolute top-4 right-4 flex size-9 cursor-pointer items-center justify-center rounded-[var(--button-radius)] text-description outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[var(--button-focus-weight)] focus-visible:ring-[var(--button-focus-color)] disabled:pointer-events-none disabled:opacity-50"
                disabled={isVerifying}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </Dialog.Close>

            <Dialog.Title className="font-heading text-ui-semibold text-foreground">{t("setupTitle")}</Dialog.Title>
            <Dialog.Description className="mx-auto mt-1 max-w-xs text-caption text-description">{t("setupDescription")}</Dialog.Description>
          </header>

          <div className="min-h-0 overflow-y-auto px-5 pt-2 pb-5 sm:px-6">
            {setupError ? (
              <div className="flex min-h-40 flex-col items-center justify-center text-center" role="alert">
                <ShieldCheck aria-hidden="true" className="size-8 text-description" strokeWidth={1.5} />
                <p className="mt-3 max-w-sm text-ui text-[var(--color-feedback-error)]">{setupError}</p>
                <Button className="mt-5 w-full" disabled={isLoading} onClick={() => void onRetry()} type="button" variant="secondary">
                  {tActions("retry")}
                </Button>
              </div>
            ) : (
              <TwoFactorAuthenticationSetupPanel
                canRefresh={canRefresh}
                isLoading={isLoading}
                isVerifying={isVerifying}
                onRefresh={onRefresh}
                onVerify={onVerify}
                qrCodeUrl={qrCodeUrl}
                verificationError={verificationError}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { TwoFactorAuthenticationSetupDialog }
