"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { AlertDialog } from "radix-ui"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { casesQueryKeys } from "../hooks/cases-query-keys"
import { IDLE_CASE_DELETION, requestCaseDeletion, type CaseDeletionState } from "../lib/case-deletion"

function CaseDeleteAction({ caseId, title, blocked = false }: { caseId: string; title: string; blocked?: boolean }) {
  const t = useTranslations("cases.caseDeletion")
  const router = useRouter()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const { data: state } = useQuery<CaseDeletionState>({ queryKey: casesQueryKeys.caseDeletion(caseId),
    queryFn: async () => IDLE_CASE_DELETION, enabled: false, initialData: IDLE_CASE_DELETION, gcTime: Infinity })
  const pending = state.phase === "deleting" || state.phase === "checking"
  async function confirm() {
    if (blocked) return
    const result = await requestCaseDeletion(client, caseId)
    if (result.phase === "deleted") {
      setOpen(false)
      toast.success(t("success"))
      router.replace("/app/cases")
    }
  }
  return <>
    <Button aria-haspopup="dialog" className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive" disabled={blocked || pending || state.phase === "deleted"}
      onClick={() => setOpen(true)} ref={trigger} size="sm" title={blocked ? t("messages.blocked") : undefined} type="button" variant="secondary">
      <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.5} />{t("action")}
    </Button>
    <AlertDialog.Root open={open} onOpenChange={next => { if (!pending) setOpen(next) }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--card-composite-radius)] border border-border bg-card p-6 shadow-lg outline-none"
          onEscapeKeyDown={event => { if (pending) event.preventDefault() }}
          onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }}>
          <AlertDialog.Title className="text-ui-semibold text-foreground">{t("title")}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 break-words text-caption leading-5 text-description">{t("description", { title })}</AlertDialog.Description>
          {blocked || state.message ? <p className="mt-3 text-caption text-destructive" role="alert">{t(`messages.${blocked ? "blocked" : state.message!}`)}</p> : null}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild><Button disabled={pending} size="sm" type="button" variant="secondary">{t("cancel")}</Button></AlertDialog.Cancel>
            <Button disabled={blocked} loading={pending} onClick={() => void confirm()} size="sm" type="button" variant={state.phase === "uncertain" ? "secondary" : "danger"}>
              {t(pending ? state.phase === "checking" ? "checking" : "deleting" : state.phase === "uncertain" ? "check" : "action")}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  </>
}

export { CaseDeleteAction }
