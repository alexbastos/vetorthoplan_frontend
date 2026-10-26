"use client"

import { useTranslations } from "next-intl"
import { Dialog } from "radix-ui"

import { useCaseFileUploadQueue } from "../hooks/use-case-file-upload-queue"
import type { CaseIngestionMonitor } from "../hooks/use-case-ingestions"
import { CaseFilesImportForm } from "./case-files-import"

type CaseFilesImportDialogProps = {
  caseId: string
  caseTitle: string
  ingestion: CaseIngestionMonitor
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestoreFocus: () => void
}

function CaseFilesImportDialog({ caseId, caseTitle, ingestion, open, onOpenChange, onRestoreFocus }: CaseFilesImportDialogProps) {
  const t = useTranslations("cases.newCase.fileImport")
  // Keep the queue mounted when the dialog closes, including files awaiting retry.
  const queue = useCaseFileUploadQueue(caseId)

  function close() {
    if (!queue.busy) onOpenChange(false)
  }

  return (
    <Dialog.Root onOpenChange={(nextOpen) => { if (nextOpen || !queue.busy) onOpenChange(nextOpen) }} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[42.5rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[var(--radius-token-xl)] shadow-[var(--shadow-card)] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          data-case-editor
          onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus() }}
          onEscapeKeyDown={(event) => { if (queue.busy) event.preventDefault() }}
          onInteractOutside={(event) => { if (queue.busy) event.preventDefault() }}
        >
          <Dialog.Title className="sr-only">{t("title")}</Dialog.Title>
          <Dialog.Description className="sr-only">{t("existingDescription", { caseTitle })}</Dialog.Description>
          <CaseFilesImportForm caseId={caseId} caseTitle={caseTitle} ingestion={ingestion} mode="existing" onClose={close} queue={queue} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { CaseFilesImportDialog }
