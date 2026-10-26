"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dialog } from "radix-ui"
import { useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { InputField } from "@/components/ui/input-field"
import { casesQueryKeys as keys } from "../hooks/cases-query-keys"
import { IDLE_IMAGE_RENAME, requestImageRename, type ImageRenameState } from "../lib/image-renaming"
import { isValidImageName, MAX_IMAGE_NAME_LENGTH, splitImageName } from "../lib/case-image-name"
import type { CaseImage } from "../types/case-image"

const overlayClassName = "fixed inset-0 z-50 bg-black/25 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0"
const contentClassName = "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--card-composite-radius)] border border-[var(--card-composite-border)] bg-card p-6 shadow-[var(--card-composite-shadow-footer)] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
const ACTIVE_DELETION_PHASES = new Set(["deleting", "checking", "uncertain", "deleted"])

function CaseImageRenameAction({ image, onRenamed }: { image: CaseImage; onRenamed?: () => void }) {
  const t = useTranslations("cases.imageRename")
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const currentName = image.displayName ?? image.originalFilename
  const renameState = useQuery<ImageRenameState>({
    queryKey: keys.imageRename(image.caseId, image.id),
    queryFn: async () => IDLE_IMAGE_RENAME,
    enabled: false,
    initialData: IDLE_IMAGE_RENAME,
  }).data
  const imageDeletion = useQuery<{ phase?: string }>({
    queryKey: keys.imageDeletion(image.caseId, image.id),
    queryFn: async () => ({ phase: "idle" }),
    enabled: false,
    initialData: { phase: "idle" },
  }).data
  const caseDeletion = useQuery<{ phase?: string }>({
    queryKey: keys.caseDeletion(image.caseId),
    queryFn: async () => ({ phase: "idle" }),
    enabled: false,
    initialData: { phase: "idle" },
  }).data
  const blocked = renameState.phase === "renaming"
    || ACTIVE_DELETION_PHASES.has(imageDeletion.phase ?? "")
    || ACTIVE_DELETION_PHASES.has(caseDeletion.phase ?? "")
  const mutation = useMutation({
    mutationFn: (name: string) => requestImageRename(client, image, name),
    retry: false,
    onSuccess: () => {
      setOpen(false)
      onRenamed?.()
    },
  })

  return <>
    <button
      aria-label={t("namedAction", { name: currentName })}
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-sm)] text-icon-muted outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      disabled={blocked || mutation.isPending}
      onClick={() => { mutation.reset(); setOpen(true) }}
      ref={trigger}
      title={t("action")}
      type="button"
    ><Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.5} /></button>
    {open ? <CaseImageRenameDialog
      error={mutation.error}
      imageName={currentName}
      originalFilename={image.originalFilename}
      onClose={() => { if (!mutation.isPending) setOpen(false) }}
      onRestoreFocus={() => requestAnimationFrame(() => trigger.current?.focus())}
      onSave={(name) => mutation.mutate(name)}
      pending={mutation.isPending}
      blocked={blocked}
    /> : null}
  </>
}

function CaseImageRenameDialog({ imageName, originalFilename, error, pending, blocked, onClose, onSave, onRestoreFocus }: {
  imageName: string
  originalFilename: string
  error: Error | null
  pending: boolean
  blocked: boolean
  onClose: () => void
  onSave: (name: string) => void
  onRestoreFocus: () => void
}) {
  const t = useTranslations("cases.imageRename")
  const { stem } = splitImageName(imageName)
  const { extension } = splitImageName(originalFilename)
  const [value, setValue] = useState(stem)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const nextName = `${value.trim()}${extension}`
  const valid = isValidImageName(nextName, originalFilename)
  const errorMessage = blocked || error?.message === "OPERATION_BLOCKED"
    ? t("messages.blocked")
    : error ? t("messages.saveFailed") : null

  return (
    <Dialog.Root onOpenChange={(isOpen) => { if (!isOpen && !pending) onClose() }} open>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClassName} />
        <Dialog.Content
          className={contentClassName}
          onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus() }}
          onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}
          onInteractOutside={(event) => { if (pending) event.preventDefault() }}
          onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.select() }}
        >
          <Dialog.Title className="text-ui-semibold text-foreground">{t("title")}</Dialog.Title>
          <Dialog.Description className="sr-only">{t("description")}</Dialog.Description>
          <form className="mt-4" data-case-editor onSubmit={(event) => {
            event.preventDefault()
            if (valid && nextName !== imageName && !pending && !blocked) onSave(nextName)
          }}>
            <InputField
              aria-describedby={!valid ? `${inputId}-error` : errorMessage ? `${inputId}-save-error` : undefined}
              aria-invalid={!valid}
              aria-label={t("name")}
              autoComplete="off"
              disabled={pending || blocked}
              id={inputId}
              maxLength={Math.max(0, MAX_IMAGE_NAME_LENGTH - extension.length)}
              onChange={(event) => setValue(event.target.value)}
              ref={inputRef}
              showLabel={false}
              trailingIcon={<span className="text-caption text-description">{extension}</span>}
              type="text"
              value={value}
            />
            {!valid ? <p className="mt-3 text-caption text-destructive" id={`${inputId}-error`} role="alert">{t("invalidName")}</p> : null}
            {errorMessage ? <p className="mt-3 text-caption text-destructive" id={`${inputId}-save-error`} role="alert">{errorMessage}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild><Button disabled={pending} size="sm" type="button" variant="secondary">{t("cancel")}</Button></Dialog.Close>
              <Button disabled={!valid || nextName === imageName || pending || blocked} loading={pending} size="sm" type="submit">{t(pending ? "saving" : "save")}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { CaseImageRenameAction }
