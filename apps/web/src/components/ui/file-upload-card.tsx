"use client"

import { UploadCloud, X } from "lucide-react"
import { useRef, useState, type ChangeEvent, type DragEvent, type HTMLAttributes } from "react"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { FileUploadList } from "./file-upload-list"
import type { FileUploadCardLabels, UploadCardFile } from "./file-upload-types"

type FileUploadCardProps = HTMLAttributes<HTMLDivElement> & {
  accept: string
  disabled?: boolean
  error?: string | null
  files: readonly UploadCardFile[]
  headingId: string
  headingLevel?: 1 | 2
  labels: FileUploadCardLabels
  locale: string
  multiple?: boolean
  onFileRetry?: (id: string) => void
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
  multiple = true,
  onFileRetry,
  onClose,
  onFileRemove,
  onFilesChange,
  ...props
}: FileUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const descriptionId = `${headingId}-formats`
  const errorId = `${headingId}-error`
  const Heading = headingLevel === 1 ? "h1" : "h2"

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
            multiple={multiple}
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

      <FileUploadList disabled={disabled} files={files} labels={labels} locale={locale}
        onFileRemove={onFileRemove} onFileRetry={onFileRetry} />
    </div>
  )
}

export { FileUploadCard }
export type { FileUploadCardLabels, FileUploadStatus, UploadCardFile } from "./file-upload-types"
