"use client"

import { AlertDialog } from "radix-ui"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

type RecoveryCodesDialogProps = {
  onClose: () => void
  recoveryCodes?: string[]
}

function RecoveryCodesDialog({ onClose, recoveryCodes }: RecoveryCodesDialogProps) {
  const t = useTranslations("settings.twoFactorAuthentication")

  return (
    <AlertDialog.Root onOpenChange={(open) => !open && onClose()} open={Boolean(recoveryCodes?.length)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/20 motion-safe:animate-in motion-safe:fade-in-0" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--card-composite-radius)] border border-[var(--card-composite-border)] bg-[var(--card-composite-surface)] shadow-[var(--card-composite-shadow-footer)] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <div className="px-[var(--card-composite-padding-inline)] py-6">
            <AlertDialog.Title className="text-ui font-semibold text-capta-text-primary">{t("recoveryCodesTitle")}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-ui text-capta-text-secondary">{t("recoveryCodesDescription")}</AlertDialog.Description>
            <ul aria-label={t("recoveryCodesTitle")} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recoveryCodes?.map((recoveryCode) => <li className="rounded-[var(--radius-token-sm)] border border-capta-border-default bg-capta-surface-card px-3 py-2 font-mono text-caption text-capta-text-primary" key={recoveryCode}>{recoveryCode}</li>)}
            </ul>
          </div>
          <footer className="flex min-h-[var(--card-footer-min-height)] justify-end bg-[var(--color-surface-raised)] px-[var(--card-composite-padding-inline)] py-[var(--card-footer-padding-block)]">
            <AlertDialog.Action asChild>
              <Button onClick={onClose} size="sm" type="button">
                {t("recoveryCodesAcknowledgement")}
              </Button>
            </AlertDialog.Action>
          </footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export { RecoveryCodesDialog }
