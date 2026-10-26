"use client"

import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { useRef, type Ref } from "react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

import type { useCaseImages } from "../hooks/use-case-images"
import type { CaseIngestionMonitor } from "../hooks/use-case-ingestions"
import { CaseIngestionRetryAction } from "./case-ingestion-retry-action"
import { CaseImageCancelAction } from "./case-image-cancel-action"
import { CaseImageDeleteAction } from "./case-image-delete-action"
import { CaseImageRenameAction } from "./case-image-rename-action"
import { CaseImageThumbnail } from "./case-image-thumbnail"

type CaseImagesListProps = { query: ReturnType<typeof useCaseImages>; ingestion: CaseIngestionMonitor; onAdd: () => void; onSelect: (imageId: string) => void; onDeleted: (imageId: string) => void; selectedId: string | null; canAdd?: boolean }

function CaseImagesList({ query, ingestion, onAdd, onSelect, onDeleted, selectedId, canAdd = true }: CaseImagesListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const emptyRef = useRef<HTMLDivElement>(null)
  const t = useTranslations("cases.workspace.images")
  const tRetry = useTranslations("cases.ingestionRetry")
  const locale = useLocale()

  if (query.isPending) return <p aria-busy="true" className="py-5 text-sm text-description">{t("loading")}</p>
  if (query.isError) return (
    <div className="space-y-3 py-4" role="alert">
      <p className="text-sm text-description">{t("loadError")}</p>
    </div>
  )
  if (query.data.length === 0) return <CaseImagesEmptyState canAdd={canAdd} containerRef={emptyRef} onAdd={onAdd} />

  return (
    <ul className="min-w-0 space-y-3 outline-none" aria-label={t("title")} ref={listRef} tabIndex={-1}>
      {query.data.map((image) => {
        const entry = ingestion.entries.find((candidate) => candidate.imageId === image.id)
        const resuming = image.status === "FAILED" && entry?.retryAcknowledged && entry.job && entry.job.status !== "FAILED"
        return (
        <li className={`relative min-w-0 rounded-[var(--radius-token-md)] border border-border p-2 transition-colors motion-reduce:transition-none ${selectedId === image.id ? "bg-hover before:absolute before:top-1/2 before:-left-2 before:h-8 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--case-editor-radio-active)]" : "hover:bg-muted/35"}`} key={image.id}>
          <div className="group/image relative min-w-0">
            <button aria-pressed={selectedId === image.id} className="group flex w-full min-w-0 cursor-pointer items-start gap-2.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelect(image.id)} type="button">
              <CaseImageThumbnail image={image} />
              <span className="min-w-0 flex-1 group-hover/image:pr-16 group-focus-within/image:pr-16 [@media(hover:none)]:pr-16">
                <span className="block truncate font-data text-[0.6875rem] leading-4 font-medium text-foreground" title={image.displayName ?? image.originalFilename}>{image.displayName ?? image.originalFilename}</span>
                <span className="mt-1 block truncate text-[0.75rem] leading-5 font-normal text-description">{image.kind} · {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(image.sizeBytes / (1024 * 1024))} MiB</span>
                {image.status === "READY" && image.widthPx && image.heightPx ? (
                  <span className="block truncate text-[0.75rem] leading-5 font-normal text-description">{t("dimensions", { width: image.widthPx, height: image.heightPx })}</span>
                ) : null}
              </span>
            </button>
            <div className="pointer-events-none absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover/image:pointer-events-auto group-hover/image:opacity-100 group-focus-within/image:pointer-events-auto group-focus-within/image:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 motion-reduce:transition-none">
              <CaseImageRenameAction image={image} />
              <CaseImageDeleteAction image={image} onDeleted={() => { onDeleted(image.id); requestAnimationFrame(() => (listRef.current ?? emptyRef.current)?.focus()) }} />
            </div>
          </div>
          {image.status !== "READY" ? <p className="mt-3 text-[0.75rem] leading-5 font-normal text-description">{resuming
            ? tRetry(entry.job!.status === "QUEUED" ? "queued" : entry.job!.status === "PROCESSING" ? "processing" : "resultPending")
            : t(`clinicalStatus.${image.status}`)}</p> : null}
          {image.status === "REJECTED" ? (
            <div className="mt-2 space-y-2">
              <p className="text-caption text-description">{t("rejectedGeneric")}</p>
              <Button disabled={!canAdd} onClick={onAdd} size="sm" type="button" variant="secondary">{t("uploadAgain")}</Button>
            </div>
          ) : null}
          {image.status === "FAILED" && !resuming ? <p className="mt-2 text-caption text-description">{t("failedDescription")}</p> : null}
          <CaseIngestionRetryAction entry={entry} onRetry={() => void ingestion.retryForImage(image.id)} />
          {image.status === "PENDING_UPLOAD" ? <CaseImageCancelAction image={image} /> : null}
          {image.status === "CANCELLED" ? (
            <div className="mt-2 space-y-2">
              <p className="text-caption text-description">{t("cancelledDescription")}</p>
              <Button disabled={!canAdd} onClick={onAdd} size="sm" type="button" variant="secondary">{t("uploadAgain")}</Button>
            </div>
          ) : null}
        </li>
      )})}
    </ul>
  )
}

function CaseImagesEmptyState({ canAdd, containerRef, onAdd }: { canAdd: boolean; containerRef: Ref<HTMLDivElement>; onAdd: () => void }) {
  const t = useTranslations("cases.workspace.images")

  return (
    <div aria-label={t("emptyTitle")} className="flex min-h-72 flex-1 items-center justify-center py-8 outline-none" ref={containerRef} tabIndex={-1}>
      <EmptyState
        action={<Button disabled={!canAdd} onClick={onAdd} size="sm" type="button">{t("addRadiograph")}</Button>}
        className="max-w-sm"
        description={t("emptyDescription")}
        descriptionClassName="text-[13px] leading-[1.4] text-description"
        illustration={<>
          <Image alt="" aria-hidden="true" className="h-auto w-[10.5rem] dark:hidden" height={114} src="/images/cases/empty-images.svg" width={142} />
          <Image alt="" aria-hidden="true" className="hidden h-auto w-[10.5rem] dark:block" height={114} src="/images/cases/empty-images-dark.svg" width={142} />
        </>}
        title={t("emptyTitle")}
        titleClassName="font-bold text-[var(--color-obsidian)] dark:text-foreground"
      />
    </div>
  )
}

export { CaseImagesList }
