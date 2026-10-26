"use client"

import { useGSAP } from "@gsap/react"
import { gsap } from "gsap"
import { CheckCircle2, CircleAlert, RotateCcw, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { formatUploadFileSize, uploadProgressValue } from "./file-upload-format"
import { ShimmerText } from "./shimmer-text"
import type { FileUploadCardLabels, UploadCardFile } from "./file-upload-types"
import styles from "./file-upload-card.module.css"

gsap.registerPlugin(useGSAP)

type FileUploadRowProps = {
  entry: UploadCardFile
  exiting: boolean
  disabled: boolean
  labels: FileUploadCardLabels
  locale: string
  onExit: (id: string) => void
  onRemove: (id: string) => void
  onRetry?: (id: string) => void
}

function FileUploadRow({ entry, exiting, disabled, labels, locale, onExit, onRemove, onRetry }: FileUploadRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const { file, id, status } = entry
  const uploading = status.state === "uploading"
  const successful = status.state === "success"
  const failed = status.state === "error"
  const [completion, setCompletion] = useState<"filling" | "fading" | "complete">(successful ? "complete" : "filling")
  const completing = successful && completion !== "complete"
  const label = completing ? labels.finishing : status.label
  const showProgress = !failed && (!successful || completing)
  const progress = uploadProgressValue(status.progress)
  const [retainedProgress, setRetainedProgress] = useState(progress)
  const displayedProgress = successful ? 100 : Math.min(99, Math.max(retainedProgress, progress))
  const transferProgress = uploadProgressValue(status.transferProgress ?? status.progress)
  const total = formatUploadFileSize(file.size, locale)
  const size = uploading ? labels.transferSize(formatUploadFileSize(file.size * transferProgress / 100, locale), total) : total
  const retryLabel = status.retryLabel ?? labels.retryFile(file.name)
  const actionLabel = status.removeLabel ?? (status.canRemove
    ? uploading ? labels.cancelFile(file.name) : labels.removeFile(file.name)
    : labels.deleteUnavailable)

  useEffect(() => {
    // Stale reads must not pull the bar backwards. A failed attempt can restart.
    setRetainedProgress(previous => failed ? 0 : Math.max(previous, progress))
  }, [failed, progress])

  useEffect(() => {
    if (!successful) { setCompletion("filling"); return }
    // Fill only after READY, then fade the bar before showing the success check.
    // Initially completed rows stay complete when the upload dialog is reopened.
    const fade = window.setTimeout(() => setCompletion(current => current === "complete" ? current : "fading"), 300)
    const finish = window.setTimeout(() => setCompletion("complete"), 600)
    return () => { window.clearTimeout(fade); window.clearTimeout(finish) }
  }, [successful])

  useGSAP(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (exiting) {
      gsap.to(rowRef.current, { opacity: 0, x: -20, duration: reduce ? 0 : 0.2,
        ease: "power2.in", onComplete: () => onExit(id) })
    } else {
      gsap.fromTo(rowRef.current, { opacity: reduce ? 1 : 0, x: reduce ? 0 : -20 }, {
        opacity: 1, x: 0, duration: reduce ? 0 : 0.3, ease: "power2.out",
      })
    }
  }, { scope: rowRef, dependencies: [exiting], revertOnUpdate: true })

  return (
    <div aria-hidden={exiting || undefined} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3" inert={exiting || undefined} ref={rowRef}>
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-content-secondary">
          {getFileBadge(file.name)}
        </span>
        <div className="min-w-0 max-w-xs">
          <p className="truncate text-sm leading-5 font-medium text-foreground" title={file.name}>{file.name}</p>
          <p className="text-xs leading-4 text-content-secondary">
            <span className="tabular-nums">{size}</span>
            <span aria-hidden="true"> · </span>
            <ShimmerText active={showProgress && !exiting} aria-live="polite"
              className={cn(successful && !completing ? "text-[var(--color-file-upload-success)]" : failed ? "text-destructive" : "text-content-secondary")}>{label}</ShimmerText>
          </p>
          <UploadProgress visible={showProgress} fading={successful && completion === "fading"}
            label={label} progress={displayedProgress} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {successful && !completing ? <CheckCircle2 aria-hidden="true" className="size-5 text-[var(--color-file-upload-success)]" /> : null}
        {failed ? <CircleAlert aria-hidden="true" className="size-5 text-destructive" /> : null}
        {status.canRetry && onRetry ? (
          <button aria-label={retryLabel} className={styles.iconButton} disabled={disabled || exiting}
            onClick={() => onRetry(id)} title={retryLabel} type="button">
            <RotateCcw aria-hidden="true" className="size-4" />
          </button>
        ) : null}
        <span title={actionLabel}>
          <button aria-label={actionLabel} className={styles.iconButton} disabled={disabled || exiting || !status.canRemove}
            onClick={() => onRemove(id)} title={actionLabel} type="button">
            {status.canRemove && status.removeKind !== "delete" ? <X aria-hidden="true" className="size-4" /> : <Trash2 aria-hidden="true" className="size-4" />}
          </button>
        </span>
      </div>
      {status.detail ? <p className="col-span-2 pl-[3.25rem] text-xs leading-4 text-destructive" role="alert">{status.detail}</p> : null}
    </div>
  )
}

function UploadProgress({ visible, fading, label, progress }: {
  visible: boolean; fading: boolean; label: string; progress: number
}) {
  if (!visible) return null
  const value = uploadProgressValue(progress)
  return (
    <div aria-label={label} aria-valuemax={100} aria-valuemin={0} aria-valuenow={value}
      className={cn(styles.progressTrack, fading && styles.progressFading)} role="progressbar">
      <span className={styles.progressIndicator} style={{ transform: `translateX(${value - 100}%)` }} />
    </div>
  )
}

function getFileBadge(name: string): string {
  const extension = name.split(".").pop()?.toUpperCase()
  return extension && extension !== name.toUpperCase() ? extension.slice(0, 4) : "FILE"
}

export { FileUploadRow }
