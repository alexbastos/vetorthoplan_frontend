"use client"

import { useTranslations } from "next-intl"
import { AlertDialog, Dialog } from "radix-ui"
import { useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { InputField } from "@/components/ui/input-field"
import { MAX_IMAGE_NAME_LENGTH, isValidImageName, splitImageName } from "../lib/case-image-name"

const overlayClassName = "fixed inset-0 z-50 bg-black/25 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0"
const contentClassName = "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--card-composite-radius)] border border-[var(--card-composite-border)] bg-card p-6 shadow-[var(--card-composite-shadow-footer)] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"

function CaseImageActionsDialog({ action, name, pending, onClose, onRename, onDelete, onRestoreFocus }: {
  action: "rename" | "delete"
  name: string
  pending: boolean
  onClose: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onRestoreFocus: () => void
}) {
  const t = useTranslations("cases.workspace.images.actions")
  const { stem, extension } = splitImageName(name)
  const [value, setValue] = useState(stem)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const nextName = `${value.trim()}${extension}`
  const valid = isValidImageName(nextName, name)

  if (action === "delete") {
    return (
      <AlertDialog.Root onOpenChange={(open) => { if (!open && !pending) onClose() }} open>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={overlayClassName} />
          <AlertDialog.Content className={contentClassName} onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus() }}>
            <AlertDialog.Title className="text-ui-semibold text-foreground">{t("deleteTitle")}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-caption leading-5 text-description">{t("deleteDescription", { name })}</AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel asChild><Button disabled={pending} size="sm" variant="secondary">{t("cancel")}</Button></AlertDialog.Cancel>
              <Button loading={pending} onClick={onDelete} size="sm" type="button" variant="danger">{t("delete")}</Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    )
  }

  return (
    <Dialog.Root onOpenChange={(open) => { if (!open && !pending) onClose() }} open>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClassName} />
        <Dialog.Content
          className={contentClassName}
          onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus() }}
          onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}
          onInteractOutside={(event) => { if (pending) event.preventDefault() }}
          onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.select() }}
        >
          <Dialog.Title className="text-ui-semibold text-foreground">{t("renameTitle")}</Dialog.Title>
          <Dialog.Description className="sr-only">{t("renameDescription")}</Dialog.Description>
          <form className="mt-4" data-case-editor onSubmit={(event) => { event.preventDefault(); if (valid && !pending && nextName !== name) onRename(nextName) }}>
            <InputField
              aria-describedby={!valid ? `${inputId}-error` : undefined}
              aria-invalid={!valid}
              aria-label={t("name")}
              autoComplete="off"
              disabled={pending}
              id={inputId}
              maxLength={MAX_IMAGE_NAME_LENGTH - extension.length}
              onChange={(event) => setValue(event.target.value)}
              ref={inputRef}
              showLabel={false}
              trailingIcon={<span className="text-caption text-description">{extension}</span>}
              type="text"
              value={value}
            />
            {!valid ? <p className="sr-only" id={`${inputId}-error`} role="alert">{t("invalidName")}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button disabled={pending} size="sm" type="button" variant="secondary">{t("cancel")}</Button>
              </Dialog.Close>
              <Button disabled={!valid || nextName === name} loading={pending} size="sm" type="submit">{t("save")}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { CaseImageActionsDialog }
