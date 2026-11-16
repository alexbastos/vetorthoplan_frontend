"use client"

import { ArrowRight, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dialog } from "radix-ui"
import { useId, useRef } from "react"

import { Button } from "@/components/ui/button"
import { CaseImageLandmarksMethodArt } from "./case-image-landmarks-method-art"

function CaseImageLandmarksMethodDialog({ onStart, onCancel, onRestoreFocus }: {
  onStart: () => boolean
  onCancel: () => void
  onRestoreFocus: (started: boolean) => void
}) {
  const t = useTranslations("cases.workspace.landmarks")
  const tActions = useTranslations("common.actions")
  const id = useId()
  const started = useRef(false)

  return <Dialog.Root open onOpenChange={open => { if (!open) onCancel() }}>
    <Dialog.Overlay className="absolute inset-0 z-40 bg-black/35" />
    <Dialog.Content className="absolute top-1/2 left-1/2 z-50 max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[var(--card-composite-radius)] border border-border bg-card p-4 text-foreground shadow-lg outline-none sm:p-5"
      onPointerDownOutside={event => event.preventDefault()}
      onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(started.current) }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Dialog.Title className="text-base font-semibold">{t("method.introTitle")}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm leading-5 text-content-secondary">{t("method.introDescription")}</Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <Button aria-label={tActions("close")} type="button" size="sm" variant="ghost" className="size-9 shrink-0 px-0">
            <X aria-hidden="true" />
          </Button>
        </Dialog.Close>
      </div>
      <button type="button" aria-labelledby={`${id}-start ${id}-method`} aria-describedby={`${id}-description`}
        className="group mt-4 flex w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[var(--radius-token-md)] border border-border bg-card text-center outline-none transition-colors hover:border-[var(--case-progress-label-active)] focus-visible:border-[var(--case-progress-label-active)] focus-visible:ring-1 focus-visible:ring-[var(--case-progress-label-active)] active:border-[var(--case-progress-label-active)]"
        onClick={() => {
          if (started.current) return
          started.current = onStart()
          onCancel()
        }}>
        <CaseImageLandmarksMethodArt />
        <span className="flex w-full flex-col gap-1.5 px-4 py-3">
          <span id={`${id}-method`} className="text-sm font-semibold transition-colors group-hover:text-[var(--case-progress-label-active)] group-focus-visible:text-[var(--case-progress-label-active)] group-active:text-[var(--case-progress-label-active)]">
            {t("methodShort.MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1")}
          </span>
          <span id={`${id}-description`} className="text-xs leading-5 text-content-secondary">
            {t("methodDescription.MEDIAL_CONDYLE_CRANIAL_CRUCIATE_FULL_AXIS_V1")}
          </span>
          <span id={`${id}-start`} className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--case-progress-label-active)]">
            {t("method.start")} <ArrowRight aria-hidden="true" className="size-3.5" />
          </span>
        </span>
      </button>
    </Dialog.Content>
  </Dialog.Root>
}

export { CaseImageLandmarksMethodDialog }
