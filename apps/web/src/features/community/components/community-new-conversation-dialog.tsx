import { ArrowRight, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dialog } from "radix-ui"
import { useRef, useState, type RefObject } from "react"

import { AppUserAvatar } from "@/components/shared/app-shell/app-user-avatar"

import { demoMembers, type DemoMember } from "../lib/demo-conversations"
import { normalizeSearchText } from "../lib/normalize-search-text"

function CommunityNewConversationDialog({ open, onOpenChange, onSelect, returnFocus, composer }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (member: DemoMember) => void
  returnFocus: RefObject<HTMLButtonElement | null>
  composer: RefObject<HTMLTextAreaElement | null>
}) {
  const t = useTranslations("community")
  const closeLabel = useTranslations("common.actions")("close")
  const [query, setQuery] = useState("")
  const searchInput = useRef<HTMLInputElement>(null)
  const memberSelected = useRef(false)
  const term = normalizeSearchText(query.trim())
  const members = demoMembers.filter(({ name }) => normalizeSearchText(name).includes(term))

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm">
          <Dialog.Content
            className="flex max-h-[min(34rem,calc(100dvh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
            onOpenAutoFocus={(event: Event) => {
              event.preventDefault()
              searchInput.current?.focus()
            }}
            onCloseAutoFocus={(event: Event) => {
              event.preventDefault()
              const target = memberSelected.current ? composer.current : returnFocus.current
              target?.focus({ preventScroll: true })
              memberSelected.current = false
              setQuery("")
            }}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 pt-5 pb-4 sm:px-6">
              <div className="min-w-0">
                <Dialog.Title className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">{t("newConversation.title")}</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[12px] text-muted-foreground">{t("newConversation.description")}</Dialog.Description>
              </div>
              <Dialog.Close aria-label={closeLabel} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-muted text-content-secondary transition-colors hover:bg-[var(--color-surface-subtle-hover)] focus-visible:bg-selected focus-visible:outline-2 focus-visible:outline-transparent" type="button">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6.00081 17.9992M17.9992 18L6 6.00085" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
              </Dialog.Close>
            </div>
            <div className="shrink-0 px-5 py-3 sm:px-6">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-search px-3 focus-within:bg-search-active">
                <Search aria-hidden="true" className="shrink-0 text-muted-foreground" size={16} strokeWidth={1.6} />
                <input
                  aria-label={t("newConversation.search")}
                  className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-[13px]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("newConversation.search")}
                  ref={searchInput}
                  type="search"
                  value={query}
                />
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-2 pb-2 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden">
              {members.length ? (
                <ul aria-label={t("newConversation.members")}>
                  {members.map((member) => (
                    <li key={member.id}>
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-muted focus-visible:bg-selected focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-transparent"
                        onClick={() => {
                          memberSelected.current = true
                          onSelect(member)
                          onOpenChange(false)
                        }}
                        type="button"
                      >
                        <AppUserAvatar avatarUrl={member.avatarUrl} className="size-9 rounded-full text-[11px]" initials={member.initials} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-foreground">{member.name}</span>
                          <span className="block truncate text-[12px] text-muted-foreground">{t(`specialties.${member.id}`)}</span>
                        </span>
                        <ArrowRight aria-hidden="true" className="shrink-0 text-muted-foreground" size={15} strokeWidth={1.6} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-8 text-center text-[13px] text-muted-foreground" role="status">{t("newConversation.noResults")}</p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { CommunityNewConversationDialog }
