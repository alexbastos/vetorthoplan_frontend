"use client"

import { Copy, FileImage, Pencil, Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRef, useState } from "react"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { cn } from "@/lib/utils"
import { useCaseImageActions } from "../hooks/use-case-image-actions"
import type { CaseWorkspaceImage } from "../types/case-workspace"
import { CaseImageActionsDialog } from "./case-image-actions-dialog"

function CaseImageListItem({ caseId, existingNames, image, isActive, onSelect }: {
  caseId: string
  existingNames: readonly string[]
  image: CaseWorkspaceImage
  isActive: boolean
  onSelect: () => void
}) {
  const t = useTranslations("cases.workspace.images")
  const locale = useLocale()
  const { requestNavigation } = useUnsavedChangesGuard()
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null)
  const renameButtonRef = useRef<HTMLButtonElement>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const selectButtonRef = useRef<HTMLButtonElement>(null)
  const actions = useCaseImageActions({ caseId, image, existingNames, onCompleted: () => setDialog(null) })
  const uploadDate = image.file.uploadedAt
    ? new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(image.file.uploadedAt))
    : null

  function deleteImage() {
    setDialog(null)
    const remove = () => actions.mutate({ kind: "delete" })
    if (isActive) requestNavigation(remove)
    else remove()
  }

  function restoreFocus() {
    const button = dialog === "rename" ? renameButtonRef.current : deleteButtonRef.current
    const target = button?.disabled ? selectButtonRef.current : button
    target?.focus()
  }

  return (
    <div className={`group/image relative min-w-0 rounded-[var(--radius-token-md)] border transition-colors motion-reduce:transition-none ${isActive ? "border-border bg-hover before:absolute before:top-4 before:bottom-4 before:-left-2 before:w-0.5 before:rounded-full before:bg-[var(--case-editor-radio-active)]" : "border-transparent hover:bg-hover focus-within:bg-hover"}`}>
      <button aria-current={isActive ? "true" : undefined} className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-[var(--radius-token-md)] p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onSelect} ref={selectButtonRef} type="button">
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[var(--case-viewer-shell)] text-white/50">
          {image.rendering.status === "ready" ? <img alt="" className="size-full object-contain" src={image.rendering.url} /> : <FileImage aria-hidden="true" className="size-5" />}
        </span>
        <span className="min-w-0 flex-1 group-hover/image:pr-20 group-focus-within/image:pr-20 [@media(hover:none)]:pr-20">
          <span className="block truncate font-data text-[0.6875rem] leading-4 font-medium text-foreground" title={image.file.name}>{image.file.name}</span>
          {uploadDate ? <time className="mt-1 block truncate text-[0.75rem] leading-5 font-normal text-description" dateTime={image.file.uploadedAt} title={t("uploadedOn", { date: uploadDate })}>{t("uploadedOn", { date: uploadDate })}</time>
            : <span className="mt-1 block truncate text-[0.75rem] leading-5 font-normal text-description" title={t("uploadDateUnavailable")}>{t("uploadDateUnavailable")}</span>}
        </span>
      </button>
      <div aria-label={t("actions.menu", { name: image.file.name })} className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover/image:pointer-events-auto group-hover/image:opacity-100 group-focus-within/image:pointer-events-auto group-focus-within/image:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 motion-reduce:transition-none" role="group">
        <button aria-label={`${t("actions.rename")}: ${image.file.name}`} className={actionButtonClassName} disabled={actions.isPending} onClick={() => setDialog("rename")} ref={renameButtonRef} title={t("actions.rename")} type="button"><Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.5} /></button>
        <button aria-label={`${t("actions.copy")}: ${image.file.name}`} className={actionButtonClassName} disabled={actions.isPending} onClick={() => actions.mutate({ kind: "copy" })} title={t("actions.copy")} type="button"><Copy aria-hidden="true" className="size-3.5" strokeWidth={1.5} /></button>
        <button aria-label={`${t("actions.delete")}: ${image.file.name}`} className={cn(actionButtonClassName, "text-destructive hover:bg-destructive/10 hover:text-destructive")} disabled={actions.isPending} onClick={() => setDialog("delete")} ref={deleteButtonRef} title={t("actions.delete")} type="button"><Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.5} /></button>
      </div>
      {dialog ? <CaseImageActionsDialog action={dialog} key={`${dialog}-${image.file.name}`} name={image.file.name} onClose={() => setDialog(null)} onDelete={deleteImage} onRename={(name) => actions.mutate({ kind: "rename", name })} onRestoreFocus={restoreFocus} pending={actions.isPending} /> : null}
    </div>
  )
}

const actionButtonClassName = "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-token-sm)] text-icon-muted outline-none hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"

export { CaseImageListItem }
