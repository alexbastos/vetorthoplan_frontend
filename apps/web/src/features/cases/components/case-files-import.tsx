"use client"

import { useLocale, useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { FileUploadCard, type FileUploadCardLabels, type UploadCardFile } from "@/components/ui/file-upload-card"

import { useCaseFileUploadQueue } from "../hooks/use-case-file-upload-queue"
import { useCaseIngestions, type CaseIngestionMonitor } from "../hooks/use-case-ingestions"
import { IMAGE_UPLOAD_ACCEPT } from "../lib/image-upload-policy"
import { imageUploadPresentation } from "../lib/image-upload-presentation"
import { canRetryIngestion } from "../lib/ingestion-job-retry"
import { canDeleteCaseImage } from "../lib/image-deletion"
import type { CaseImage } from "../types/case-image"
import { CaseImageDeleteDialog } from "./case-image-delete-action"

type CaseFilesImportProps = {
  caseId: string
  caseTitle: string
  onBusyChange?: (busy: boolean) => void
  onConfirmed?: () => void
  onClose?: () => void
  mode?: "new" | "existing"
  ingestion?: CaseIngestionMonitor
}

function CaseFilesImport(props: CaseFilesImportProps) {
  return props.ingestion ? <CaseFilesImportContent {...props} ingestion={props.ingestion} /> : <StandaloneFilesImport {...props} />
}

function StandaloneFilesImport(props: CaseFilesImportProps) {
  const ingestion = useCaseIngestions(props.caseId)
  return <CaseFilesImportContent {...props} ingestion={ingestion} />
}

function CaseFilesImportContent({ caseId, caseTitle, onBusyChange, onConfirmed, onClose, mode = "new", ingestion }: CaseFilesImportProps & { ingestion: CaseIngestionMonitor }) {
  const locale = useLocale()
  const t = useTranslations("cases.newCase.fileImport")
  const tRetry = useTranslations("cases.ingestionRetry")
  const tCancel = useTranslations("cases.uploadCancellation")
  const tDelete = useTranslations("cases.imageDeletion")
  const [deleteTarget, setDeleteTarget] = useState<CaseImage | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const queue = useCaseFileUploadQueue(caseId)
  const completions = queue.items.filter((item) => item.completed).map((item) => item.completed!)
  const { imagesQuery } = ingestion
  const confirmed = completions.length > 0 || queue.items.some(item => item.phase === "stored")
  const labels: FileUploadCardLabels = {
    browse: t("browse"),
    close: t(mode === "new" ? "openCase" : "backToImages"),
    description: t(mode === "new" ? "sectionDescription" : "existingDescription", { caseTitle }),
    dropTitle: t("dropTitle"),
    formats: t("formats"),
    deleteUnavailable: t("deleteUnavailable"),
    cancelFile: (fileName) => t("cancelFile", { fileName }),
    removeFile: (fileName) => t("removeFile", { fileName }),
    retryFile: (fileName) => t("retryFile", { fileName }),
    transferSize: (uploaded, total) => t("transferSize", { uploaded, total }),
    title: t("title"),
  }
  const files: UploadCardFile[] = []
  for (const item of queue.items) {
    const imageId = item.completed?.imageId ?? item.persisted?.imageId ?? item.identity?.imageId
    const entry = ingestion.entries.find((candidate) => candidate.imageId === imageId)
    const image = imagesQuery.data?.find((candidate) => candidate.id === imageId)
    const presentation = imageUploadPresentation(item, image?.status, entry?.job?.status, Boolean(entry?.error), entry?.retryAcknowledged)
    const state = entry?.retryState
    const busy = state?.phase === "checking" || state?.phase === "requesting"
    const persistent = Boolean(item.completed || item.phase === "stored")
    const deletable = persistent && image && canDeleteCaseImage(image) && !busy
    files.push({ file: item.file, id: item.id, status: { ...presentation,
      canRemove: persistent ? Boolean(deletable) : presentation.canRemove,
      removeKind: persistent ? "delete" : "cancel",
      state: busy ? "processing" : presentation.state,
      canRetry: busy || item.phase === "cancelling" ? false : presentation.canRetry || Boolean(entry && canRetryIngestion(entry)),
      removeLabel: persistent ? tDelete(deletable ? "namedAction" : "blockedAction", { name: item.file.name })
        : item.phase !== "cancel-error" && (item.identity || item.sessionAttempt) ? tCancel("cancelFile", { fileName: item.file.name }) : undefined,
      retryLabel: item.phase === "cancel-error" ? `${tCancel(item.cancellation?.phase === "uncertain" ? "check" : "action")}: ${item.file.name}`
        : item.completed || item.phase === "stored" ? `${tRetry(state?.phase === "uncertain" || state?.phase === "error" ? "check" : "action")}: ${item.file.name}` : undefined,
      label: busy ? tRetry(state.phase === "checking" ? "checking" : "requesting") : state?.phase === "uncertain" ? tRetry("unconfirmed") : t(presentation.label),
      detail: item.phase === "cancel-error" && item.cancellation?.message ? tCancel(`messages.${item.cancellation.message}`)
        : state?.message ? tRetry(`messages.${state.message}`) : presentation.detail ? t(presentation.detail) : undefined,
    } })
  }

  useEffect(() => { onBusyChange?.(queue.busy) }, [onBusyChange, queue.busy])
  useEffect(() => { if (confirmed) onConfirmed?.() }, [confirmed, onConfirmed])
  return (
    <section aria-label={t("title")} className="mx-auto mt-4 w-full max-w-[42.5rem] outline-none" ref={sectionRef} tabIndex={-1}>
      <FileUploadCard
        accept={IMAGE_UPLOAD_ACCEPT}
        aria-busy={queue.busy}
        files={files}
        headingId="case-files-title"
        headingLevel={mode === "new" ? 1 : 2}
        labels={labels}
        locale={locale}
        multiple
        onClose={mode === "existing" && !queue.busy ? onClose : undefined}
        onFileRemove={id => {
          const item = queue.items.find(candidate => candidate.id === id)
          if (item?.completed || item?.phase === "stored") {
            const image = imagesQuery.data?.find(candidate => candidate.id === (item.completed?.imageId ?? item.persisted?.imageId))
            if (image && canDeleteCaseImage(image)) setDeleteTarget(image)
          } else void queue.removeFile(id)
        }}
        onFileRetry={(id) => {
          const item = queue.items.find((candidate) => candidate.id === id)
          if (item?.completed || item?.phase === "stored") void ingestion.retryForImage(item.completed?.imageId ?? item.persisted!.imageId)
          else queue.retry(id)
        }}
        onFilesChange={queue.addFiles}
      />
      {deleteTarget ? <CaseImageDeleteDialog image={deleteTarget} onClose={() => {
        setDeleteTarget(null)
        requestAnimationFrame(() => sectionRef.current?.focus())
      }} /> : null}
      {queue.items.some((item) => item.error === "CASE_NOT_FOUND") ? (
        <p className="mt-3 text-sm text-destructive" role="alert">{t("sessionErrors.CASE_NOT_FOUND")}</p>
      ) : null}
      {ingestion.hasReadError || ingestion.hasFailedJob || ingestion.hasMissingJob || ingestion.hasUnscheduledJob ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-token-md)] border border-border bg-card px-4 py-3 text-sm" role="status">
          <p className="text-content-secondary">{t(ingestion.hasMissingJob ? "jobMissing" : ingestion.hasUnscheduledJob ? "jobNotScheduled"
            : ingestion.hasReadError ? "jobReadError" : "failedDescription")}</p>
          <Button disabled={ingestion.isRefreshing} onClick={() => void ingestion.refresh()} size="sm" type="button" variant="secondary">{t("refreshProcessing")}</Button>
        </div>
      ) : null}
      {ingestion.needsImageRefresh ? (
        <Button className="mt-4" disabled={ingestion.isRefreshing} onClick={() => void ingestion.refresh()} size="sm" type="button" variant="secondary">{t("refreshImage")}</Button>
      ) : null}
    </section>
  )
}

export { CaseFilesImport }
