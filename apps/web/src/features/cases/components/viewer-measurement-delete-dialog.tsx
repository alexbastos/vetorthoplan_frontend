"use client"

import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { AlertDialog } from "radix-ui"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

function ViewerMeasurementDeleteDialog({ kind, title, description, confirmLabel, warning, status, pending, canCancel, canConfirm, neutralConfirm = false, onCancel, onConfirm }: {
  kind: "distance" | "angle" | "circle" | "landmarks" | "tplo"
  title: string
  description: string
  confirmLabel: string
  warning?: string
  status?: string
  pending: boolean
  canCancel: boolean
  canConfirm: boolean
  neutralConfirm?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useTranslations("common.actions")
  const contentRef = useRef<HTMLDivElement>(null)
  const [fullscreenContainer, setFullscreenContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const update = () => setFullscreenContainer(document.fullscreenElement instanceof HTMLElement ? document.fullscreenElement : null)
    update()
    document.addEventListener("fullscreenchange", update)
    return () => document.removeEventListener("fullscreenchange", update)
  }, [])

  return <AlertDialog.Root open onOpenChange={open => { if (!open && canCancel) onCancel() }}>
    <AlertDialog.Portal container={fullscreenContainer ?? undefined}>
      <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/35" />
      <AlertDialog.Content ref={contentRef}
        className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[var(--card-composite-radius)] border border-border bg-card px-4 py-5 text-center text-foreground shadow-lg outline-none"
        {...{ [`data-${kind}-delete-dialog`]: true }}
        aria-busy={pending}
        onOpenAutoFocus={event => {
          if (canCancel) return
          event.preventDefault()
          contentRef.current?.focus({ preventScroll: true })
        }}
        onCloseAutoFocus={event => event.preventDefault()}
        onEscapeKeyDown={event => { if (!canCancel) event.preventDefault() }}>
        {canCancel ? <Button aria-label={t("close")} type="button" size="sm" variant="ghost"
          className="absolute top-2 right-2 size-7 px-0 text-content-secondary" onClick={onCancel}>
          <X aria-hidden="true" className="size-4" />
        </Button> : null}
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="mx-auto size-6 text-muted-foreground">
          <path fillRule="evenodd" d="M10 3h4a1.5 1.5 0 0 1 1.5 1.5V6H19a1 1 0 1 1 0 2H5a1 1 0 0 1 0-2h3.5V4.5A1.5 1.5 0 0 1 10 3Zm.5 3h3V5h-3v1Z" />
          <path fillRule="evenodd" d="M6 10h12l-.8 9.2a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8L6 10Zm3.25 3a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0V13Zm4 0a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-1.5 0V13Z" />
        </svg>
        <AlertDialog.Title className="mt-3 px-4 text-sm font-medium leading-5">{title}</AlertDialog.Title>
        <AlertDialog.Description className="mt-1 px-2 text-xs leading-5 text-content-secondary wrap-anywhere">{description}</AlertDialog.Description>
        {warning ? <p className="mt-2 text-xs leading-5 text-content-secondary">{warning}</p> : null}
        {status ? <p className="mt-2 text-xs leading-5 text-destructive" role="status">{status}</p> : null}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <AlertDialog.Cancel asChild>
            <Button disabled={!canCancel} size="sm" type="button" variant="secondary"
              className="h-8 min-w-0 px-3 text-xs">{t("cancel")}</Button>
          </AlertDialog.Cancel>
          <Button disabled={!canConfirm} loading={pending} onClick={onConfirm} size="sm" type="button"
            variant={neutralConfirm ? "secondary" : "danger"}
            className="h-auto min-h-8 max-w-full min-w-0 px-3 py-1.5 text-center text-xs whitespace-normal">
            <span className="min-w-0 wrap-anywhere">{confirmLabel}</span>
          </Button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
}

export { ViewerMeasurementDeleteDialog }
