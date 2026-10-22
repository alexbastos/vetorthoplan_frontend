"use client"

import { FileImage, RefreshCw } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRef } from "react"

import { Button } from "@/components/ui/button"

import type { useCaseImages } from "../hooks/use-case-images"
import type { CaseIngestionMonitor } from "../hooks/use-case-ingestions"
import { CaseIngestionRetryAction } from "./case-ingestion-retry-action"
import { CaseImageCancelAction } from "./case-image-cancel-action"
import { CaseImageDeleteAction } from "./case-image-delete-action"

type CaseImagesListProps = { query: ReturnType<typeof useCaseImages>; ingestion: CaseIngestionMonitor; onAdd: () => void; onSelect: (imageId: string) => void; onDeleted: (imageId: string) => void; selectedId: string | null; canAdd?: boolean }

function CaseImagesList({ query, ingestion, onAdd, onSelect, onDeleted, selectedId, canAdd = true }: CaseImagesListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const t = useTranslations("cases.workspace.images")
  const tRetry = useTranslations("cases.ingestionRetry")
  const locale = useLocale()

  if (query.isPending) return <p aria-busy="true" className="py-5 text-sm text-description">{t("loading")}</p>
  if (query.isError) return (
    <div className="space-y-3 py-4" role="alert">
      <p className="text-sm text-description">{t("loadError")}</p>
      <Button onClick={() => void query.refetch()} size="sm" type="button" variant="secondary"><RefreshCw aria-hidden="true" />{t("refresh")}</Button>
    </div>
  )

  return (
    <ul className="space-y-2 outline-none" aria-label={t("title")} ref={listRef} tabIndex={-1}>
      {query.data.length === 0 ? <li className="py-5 text-sm leading-6 text-description">{t("empty")}</li> : null}
      {query.data.map((image) => {
        const entry = ingestion.entries.find((candidate) => candidate.imageId === image.id)
        const resuming = image.status === "FAILED" && entry?.retryAcknowledged && entry.job && entry.job.status !== "FAILED"
        return (
        <li className={`rounded-[var(--radius-token-md)] border px-3 py-3 ${selectedId === image.id ? "border-[var(--case-progress-label-active)] bg-muted/40" : "border-border"}`} key={image.id}>
          <button aria-pressed={selectedId === image.id} className="w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelect(image.id)} type="button">
          <div className="flex items-start gap-2.5">
            <FileImage aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-content-secondary" />
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium text-foreground">{image.originalFilename}</p>
              <p className="mt-1 text-caption text-description">{image.kind} · {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(image.sizeBytes / (1024 * 1024))} MiB</p>
            </div>
          </div>
          <p className="mt-2 text-xs font-medium text-foreground">{resuming
            ? tRetry(entry.job!.status === "QUEUED" ? "queued" : entry.job!.status === "PROCESSING" ? "processing" : "resultPending")
            : t(`clinicalStatus.${image.status}`)}</p>
          {image.status === "READY" && image.widthPx && image.heightPx ? (
            <p className="mt-1 text-caption text-description">{t("dimensions", { width: image.widthPx, height: image.heightPx })}</p>
          ) : null}
          {image.status === "READY" ? <p className="mt-1 text-caption text-description">{t(image.previewAvailable ? "previewAvailable" : "previewUnavailable")}</p> : null}
          </button>
          {image.status === "REJECTED" ? (
            <div className="mt-2 space-y-2">
              <p className="text-caption text-description">{t("rejectedGeneric")}</p>
              <Button disabled={!canAdd} onClick={onAdd} size="sm" type="button" variant="secondary">{t("uploadAgain")}</Button>
            </div>
          ) : null}
          {image.status === "FAILED" && !resuming ? <p className="mt-2 text-caption text-description">{t("failedDescription")}</p> : null}
          <CaseIngestionRetryAction entry={entry} onRetry={() => void ingestion.retryForImage(image.id)} />
          {image.status === "PENDING_UPLOAD" ? <CaseImageCancelAction image={image} /> : null}
          <CaseImageDeleteAction image={image} onDeleted={() => { onDeleted(image.id); requestAnimationFrame(() => listRef.current?.focus()) }} />
          {image.status === "CANCELLED" ? (
            <div className="mt-2 space-y-2">
              <p className="text-caption text-description">{t("cancelledDescription")}</p>
              <Button disabled={!canAdd} onClick={onAdd} size="sm" type="button" variant="secondary">{t("uploadAgain")}</Button>
            </div>
          ) : null}
        </li>
      )})}
      <li><Button onClick={() => void query.refetch()} size="sm" type="button" variant="ghost"><RefreshCw aria-hidden="true" />{t("refresh")}</Button></li>
    </ul>
  )
}

export { CaseImagesList }
