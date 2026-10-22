"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { AlertDialog } from "radix-ui"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { casesQueryKeys } from "../hooks/cases-query-keys"
import { canDeleteCaseImage, IDLE_DELETION, requestImageDeletion, type ImageDeletionState } from "../lib/image-deletion"
import type { CaseImage } from "../types/case-image"

function CaseImageDeleteAction({ image, onDeleted }: { image: CaseImage; onDeleted: () => void }) {
  const t = useTranslations("cases.imageDeletion")
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  if (!canDeleteCaseImage(image) && !open) return null
  return <>
    <Button aria-label={t("namedAction", { name: image.originalFilename })} className="mt-2" disabled={!canDeleteCaseImage(image)} onClick={() => setOpen(true)} ref={trigger} size="sm" type="button" variant="ghost"><Trash2 aria-hidden="true" />{t("action")}</Button>
    {open ? <CaseImageDeleteDialog image={image} onClose={(deleted) => {
      setOpen(false)
      if (deleted) onDeleted()
      else requestAnimationFrame(() => trigger.current?.focus())
    }} /> : null}
  </>
}

function CaseImageDeleteDialog({ image, onClose }: { image: CaseImage; onClose: (deleted: boolean) => void }) {
  const t = useTranslations("cases.imageDeletion")
  const client = useQueryClient()
  const query = useQuery<ImageDeletionState>({ queryKey: casesQueryKeys.imageDeletion(image.caseId, image.id), queryFn: async () => IDLE_DELETION,
    enabled: false, initialData: IDLE_DELETION })
  const state = query.data
  const pending = state.phase === "deleting" || state.phase === "checking"
  const uncertain = state.phase === "uncertain"
  const identity = { caseId: image.caseId, imageId: image.id, uploadId: image.uploadId }
  async function confirm() {
    const result = await requestImageDeletion(client, identity)
    if (result.phase === "deleted") onClose(true)
  }
  return <AlertDialog.Root open onOpenChange={open => { if (!open && !pending) onClose(false) }}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" />
      <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--card-composite-radius)] border border-border bg-card p-6 shadow-lg outline-none"
        onCloseAutoFocus={event => event.preventDefault()} onEscapeKeyDown={event => { if (pending) event.preventDefault() }}>
        <AlertDialog.Title className="text-ui-semibold text-foreground">{t("title")}</AlertDialog.Title>
        <AlertDialog.Description className="mt-2 break-words text-caption leading-5 text-description">{t("description", { name: image.originalFilename })}</AlertDialog.Description>
        {state.message ? <p className="mt-3 text-caption text-destructive" role="alert">{t(`messages.${state.message}`)}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <AlertDialog.Cancel asChild><Button disabled={pending} size="sm" variant="secondary">{t("cancel")}</Button></AlertDialog.Cancel>
          <Button loading={pending} onClick={() => void confirm()} size="sm" type="button" variant={uncertain ? "secondary" : "danger"}>{t(pending ? state.phase === "checking" ? "checking" : "deleting" : uncertain ? "check" : "action")}</Button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
}
export { CaseImageDeleteAction, CaseImageDeleteDialog }
