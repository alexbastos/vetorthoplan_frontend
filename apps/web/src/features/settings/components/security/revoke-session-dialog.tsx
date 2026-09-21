"use client"

import { AlertDialog } from "radix-ui"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

import type { ActiveSession } from "../../types/settings"

type RevokeSessionDialogProps = {
  isRevoking: boolean
  onCancel: () => void
  onConfirm: () => Promise<void>
  session: ActiveSession | null
}

function RevokeSessionDialog({ isRevoking, onCancel, onConfirm, session }: RevokeSessionDialogProps) {
  const t = useTranslations("settings.devices")
  const tActions = useTranslations("common.actions")
  const deviceName = session?.deviceName || t("unknownDevice")

  return (
    <AlertDialog.Root
      onOpenChange={(open) => {
        if (!open && !isRevoking) {
          onCancel()
        }
      }}
      open={session !== null}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/20 motion-safe:animate-in motion-safe:fade-in-0" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--card-composite-radius)] border border-[var(--card-composite-border)] bg-[var(--card-composite-surface)] shadow-[var(--card-composite-shadow-footer)] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          onEscapeKeyDown={(event) => {
            if (isRevoking) {
              event.preventDefault()
            }
          }}
        >
          <div className="px-[var(--card-composite-padding-inline)] py-6">
            <AlertDialog.Title className="text-ui font-semibold text-foreground">
              {t("confirmRevokeTitle")}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-ui text-content-secondary">
              {t("confirmRevokeDescription", { device: deviceName })}
            </AlertDialog.Description>
          </div>

          <footer className="flex min-h-[var(--card-footer-min-height)] flex-col-reverse gap-3 bg-[var(--color-surface-raised)] px-[var(--card-composite-padding-inline)] py-[var(--card-footer-padding-block)] sm:flex-row sm:items-center sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button disabled={isRevoking} size="sm" type="button" variant="secondary">
                {tActions("cancel")}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                loading={isRevoking}
                onClick={(event) => {
                  event.preventDefault()
                  void onConfirm()
                }}
                size="sm"
                type="button"
                variant="danger"
              >
                {isRevoking ? t("revokingAction") : t("confirmRevokeAction")}
              </Button>
            </AlertDialog.Action>
          </footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export { RevokeSessionDialog }
