"use client"

import { useTranslations } from "next-intl"
import { Dialog } from "radix-ui"
import { useRef } from "react"

import { Button } from "@/components/ui/button"

function CalibrationIntroductionDialog({ open, recalibrating = false, onConfirm, onCancel, onRestoreFocus }: {
  open: boolean
  recalibrating?: boolean
  onConfirm: () => void
  onCancel: () => void
  onRestoreFocus: () => void
}) {
  const t = useTranslations("cases.workspace.calibration.introduction")
  const confirmRef = useRef<HTMLButtonElement>(null)

  return <Dialog.Root modal={false} open={open} onOpenChange={next => { if (!next) onCancel() }}>
    <Dialog.Content className="absolute right-4 bottom-4 z-30 max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-xs overflow-y-auto rounded-[var(--card-composite-radius)] border border-border bg-card p-5 shadow-lg outline-none"
      data-case-editor
      onInteractOutside={event => event.preventDefault()}
      onOpenAutoFocus={event => { event.preventDefault(); confirmRef.current?.focus() }}
      onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus() }}>
      <Dialog.Title className="text-ui-semibold text-foreground">{t("title")}</Dialog.Title>
      <Dialog.Description className="mt-3 text-ui leading-5 text-description">{t(recalibrating ? "recalibrationDescription" : "description")}</Dialog.Description>
      <Button className="mt-4 w-full" onClick={onConfirm} ref={confirmRef} size="sm" type="button">{t("confirm")}</Button>
    </Dialog.Content>
  </Dialog.Root>
}

export { CalibrationIntroductionDialog }
