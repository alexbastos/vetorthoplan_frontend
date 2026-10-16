"use client"

import { CheckCircle2, LoaderCircle, Trash2, UploadCloud, X } from "lucide-react"
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type HTMLAttributes } from "react"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import shimmerStyles from "./orthovet-loader-text.module.css"

type UploadCardFile = {
  file: File
  id: string
}

type FileUploadCardLabels = {
  browse: string
  close: string
  description: string
  dropTitle: string
  formats: string
  importing: string
  preparing: string
  ready: string
  removeFile: (fileName: string) => string
  title: string
}

type FileUploadCardProps = HTMLAttributes<HTMLDivElement> & {
  accept: string
  disabled?: boolean
  error?: string | null
  files: readonly UploadCardFile[]
  headingId: string
  headingLevel?: 1 | 2
  labels: FileUploadCardLabels
  locale: string
  onClose?: () => void
  onFileRemove: (id: string) => void
  onFilesChange: (files: File[]) => void
}

function FileUploadCard({
  accept,
  className,
  disabled = false,
  error,
  files,
  headingId,
  headingLevel = 2,
  labels,
  locale,
  onClose,
  onFileRemove,
  onFilesChange,
  ...props
}: FileUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [preparationProgress, setPreparationProgress] = useState<Record<string, number>>({})
  const descriptionId = `${headingId}-formats`
  const errorId = `${headingId}-error`
  const Heading = headingLevel === 1 ? "h1" : "h2"

  useEffect(() => {
    if (files.length === 0) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPreparationProgress((current) => {
        const next = { ...current }
        for (const { id } of files) next[id] = 100
        return next
      })
      return
    }

    const timer = window.setInterval(() => {
      setPreparationProgress((current) => {
        const next = { ...current }
        let hasPendingFile = false

        for (const { id } of files) {
          const progress = current[id] ?? 0
          if (progress < 100) {
            next[id] = Math.min(100, progress + 10)
            hasPendingFile = true
          }
        }

        if (!hasPendingFile) window.clearInterval(timer)
        return hasPendingFile ? next : current
      })
    }, 120)

    return () => window.clearInterval(timer)
  }, [files])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    if (input.files?.length) onFilesChange(Array.from(input.files))
    input.value = ""
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current += 1
    if (!disabled) setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragging(false)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = disabled ? "none" : "copy"
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDragging(false)
    if (!disabled && event.dataTransfer.files.length) {
      onFilesChange(Array.from(event.dataTransfer.files))
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-token-xl)] border border-border bg-card shadow-[var(--shadow-card)]", className)} {...props}>
      <div className="px-5 pt-5 pb-6 sm:px-6 sm:pt-6">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-content-secondary">
            <UploadCloud className="size-6" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <Heading className="text-[1.125rem] leading-6 font-semibold text-foreground" id={headingId}>{labels.title}</Heading>
            <p className="mt-1 text-[0.8125rem] leading-5 text-content-secondary">{labels.description}</p>
          </div>
          {onClose ? (
            <button
              aria-label={labels.close}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-content-secondary outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-6 flex min-h-52 flex-col items-center justify-center rounded-[var(--radius-token-lg)] border-2 border-dashed px-4 py-7 text-center transition-colors motion-reduce:transition-none",
            isDragging ? "border-[var(--color-electric-iris)] bg-accent-soft" : "border-border bg-card",
            error && "border-[var(--color-feedback-error)]",
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <UploadCloud aria-hidden="true" className="size-9 text-content-secondary" strokeWidth={1.75} />
          <p className="mt-4 text-[0.875rem] leading-5 font-semibold text-foreground">{labels.dropTitle}</p>
          <p className="mt-1 text-caption text-content-secondary" id={descriptionId}>{labels.formats}</p>
          <input
            accept={accept}
            disabled={disabled}
            hidden
            multiple
            onChange={handleFileChange}
            ref={inputRef}
            type="file"
          />
          <Button aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`} aria-invalid={Boolean(error)} className="mt-4 !rounded-[var(--radius-token-md)]" disabled={disabled} onClick={() => inputRef.current?.click()} size="sm" type="button" variant="secondary">
            {labels.browse}
          </Button>
        </div>
        {error ? <p className="mt-3 text-caption text-[var(--color-feedback-error)]" id={errorId} role="alert">{error}</p> : null}
      </div>

      {files.length > 0 ? (
        <div className="border-t border-border px-5 py-4 sm:px-6">
          <ul className="space-y-3">
            {files.map(({ file, id }) => {
              const progress = preparationProgress[id] ?? 0
              const isPreparing = !disabled && progress < 100

              return <li className="flex min-w-0 items-center gap-3" key={id}>
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-token-md)] bg-muted text-[0.6875rem] font-semibold text-content-secondary">
                  {getFileBadge(file.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8125rem] leading-5 font-medium text-foreground" title={file.name}>{file.name}</p>
                  <p className="text-caption text-content-secondary">
                    {formatFileSize(file.size, locale)} <span aria-hidden="true">·</span>{" "}
                    <span aria-live="polite" className={cn(disabled || isPreparing ? "text-content-secondary" : "text-[var(--color-file-upload-success)]", isPreparing && shimmerStyles.loading)}>
                      <span className={isPreparing ? shimmerStyles.label : undefined} style={isPreparing ? { animationDelay: "300ms", animationDuration: "1s" } : undefined}>
                        {disabled ? labels.importing : isPreparing ? labels.preparing : labels.ready}
                      </span>
                    </span>
                  </p>
                  {isPreparing ? (
                    <div aria-label={labels.preparing} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="mt-1.5 h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-muted" role="progressbar">
                      <span className="block h-full rounded-full bg-[var(--color-electric-iris)] transition-[width] duration-150 ease-out motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                    </div>
                  ) : null}
                  {disabled ? (
                    <div aria-label={labels.importing} className="mt-1.5 h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-muted" role="progressbar">
                      <span className="block h-full w-2/5 animate-pulse rounded-full bg-[var(--color-electric-iris)] motion-reduce:animate-none" />
                    </div>
                  ) : null}
                </div>
                {disabled || isPreparing ? (
                  <LoaderCircle aria-hidden="true" className="size-5 shrink-0 animate-spin text-content-secondary motion-reduce:animate-none" />
                ) : (
                  <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-[var(--color-file-upload-success)]" />
                )}
                <button
                  aria-label={labels.removeFile(file.name)}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-content-secondary outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled}
                  onClick={() => {
                    setPreparationProgress((current) => {
                      const next = { ...current }
                      delete next[id]
                      return next
                    })
                    onFileRemove(id)
                  }}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function getFileBadge(name: string): string {
  const extension = name.split(".").pop()?.toUpperCase()
  return extension && extension !== name.toUpperCase() ? extension.slice(0, 4) : "FILE"
}

function formatFileSize(size: number, locale: string): string {
  if (size < 1_024) return `${size} B`
  if (size < 1_048_576) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size / 1_024)} KB`
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size / 1_048_576)} MB`
}

export { FileUploadCard }
export type { FileUploadCardLabels, UploadCardFile }
