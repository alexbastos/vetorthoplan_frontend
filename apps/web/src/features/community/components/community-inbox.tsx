import { BellOff, Ellipsis, Search, SquarePen, X } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useEffect, useId, useRef, useState, type MouseEvent, type RefObject } from "react"

import { CommunityNavigationIcon } from "@/components/shared/app-shell/app-navigation-icons"
import { AppUserAvatar } from "@/components/shared/app-shell/app-user-avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import type { CommunityMessage, ConversationId, DemoConversation } from "../lib/demo-conversations"
import { normalizeSearchText } from "../lib/normalize-search-text"
import styles from "./community-inbox.module.css"

type CommunityInboxProps = {
  conversations: readonly DemoConversation[]
  latestMessages: Readonly<Partial<Record<ConversationId, CommunityMessage>>>
  selectedId: ConversationId | undefined
  unread: ReadonlySet<ConversationId>
  muted: ReadonlySet<ConversationId>
  onSelect: (id: ConversationId) => void
  onNewConversation: (event: MouseEvent<HTMLButtonElement>) => void
  newConversationButton: RefObject<HTMLButtonElement | null>
  onToggleUnread: (id: ConversationId) => void
  returnFocusRef: RefObject<HTMLButtonElement | null>
  scrollRef: RefObject<HTMLDivElement | null>
}

function CommunityInbox({ conversations, latestMessages, selectedId, unread, muted, onSelect, onNewConversation, newConversationButton, onToggleUnread, returnFocusRef, scrollRef }: CommunityInboxProps) {
  const t = useTranslations("community")
  const format = useFormatter()
  const searchId = useId()
  const headingId = useId()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const searchToggle = useRef<HTMLButtonElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const normalizedQuery = normalizeSearchText(query.trim())
  const isEmpty = conversations.length === 0
  const results = conversations.filter(({ name }) => normalizeSearchText(name).includes(normalizedQuery))

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus()
  }, [searchOpen])

  function closeSearch() {
    setQuery("")
    setSearchOpen(false)
    searchToggle.current?.focus()
  }

  return (
    <>
      <header className={styles.header} data-search-open={searchOpen}>
        <h1 className={styles.heading}>
          <CommunityNavigationIcon aria-hidden="true" className="shrink-0 text-content-secondary" width={16} height={16} />
          {t("messages")}
        </h1>
        <div className={cn(styles.search, isEmpty && "invisible")}>
          <button
            aria-controls={searchId}
            aria-expanded={searchOpen}
            aria-label={t(searchOpen ? "closeSearch" : "searchConversations")}
            className={cn(styles.searchToggle, "grid size-9 shrink-0 place-items-center rounded-full text-content-secondary hover:bg-muted")}
            onClick={searchOpen ? closeSearch : () => setSearchOpen(true)}
            ref={searchToggle}
            type="button"
          >
            {searchOpen ? <X aria-hidden="true" size={16} /> : <Search aria-hidden="true" size={15} strokeWidth={1.6} />}
          </button>
          <div className={styles.searchField} id={searchId} inert={!searchOpen}>
            <input
              aria-label={t("searchConversations")}
              className="h-9 w-full min-w-0 bg-transparent pr-1 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeSearch()
              }}
              placeholder={t("searchPlaceholder")}
              ref={searchInput}
              type="search"
              value={query}
            />
          </div>
        </div>
        <button
          aria-haspopup="dialog"
          aria-label={t("newConversation.title")}
          className="grid size-9 shrink-0 place-items-center rounded-full text-content-secondary hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          onClick={onNewConversation}
          ref={newConversationButton}
          title={t("newConversation.title")}
          type="button"
        >
          <SquarePen aria-hidden="true" size={16} strokeWidth={1.6} />
        </button>
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", isEmpty && "hidden lg:block")} ref={scrollRef}>
        <h2 className="flex items-center gap-2 px-4 pt-4 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase" id={headingId}>
          {t("directMessages")}
          <span aria-live="polite" className="font-medium">({results.length})</span>
        </h2>
        <ul aria-labelledby={headingId}>
          {results.map((conversation) => {
            const { id, name, initials, avatarUrl, updatedAt } = conversation
            const latest = latestMessages[id]
            const timestamp = latest?.sentAt ?? updatedAt
            const selected = selectedId === id
            const isUnread = unread.has(id)
            return (
              <li className={styles.row} data-selected={selected} key={id}>
                <button
                  aria-current={selected ? "true" : undefined}
                  aria-label={isUnread ? t("unreadConversation", { name }) : name}
                  className={styles.openConversation}
                  onClick={() => onSelect(id)}
                  ref={selected ? returnFocusRef : undefined}
                  type="button"
                >
                  <AppUserAvatar avatarUrl={avatarUrl} className="size-10 rounded-full text-[12px]" initials={initials} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5 pr-8">
                      <span className={cn("truncate text-[13px]", (selected || isUnread) && "font-semibold")}>{name}</span>
                      {muted.has(id) ? <BellOff aria-label={t("mutedConversation")} className="shrink-0 text-muted-foreground" role="img" size={12} /> : null}
                      {isUnread ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-muted-foreground">
                      <span className="min-w-0 truncate text-[12px]">{latest?.text ?? t("emptyConversation")}</span>
                      <time className="shrink-0 text-[11px]" dateTime={timestamp}>
                        {format.dateTime(new Date(timestamp), { month: "short", day: "numeric" })}
                      </time>
                    </div>
                  </div>
                </button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    aria-label={t("conversationOptions", { name })}
                    className={styles.options}
                    type="button"
                  >
                    <Ellipsis aria-hidden="true" size={15} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-auto min-w-44">
                    <DropdownMenuItem onSelect={() => onToggleUnread(id)}>
                      {t(isUnread ? "markRead" : "markUnread")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
        {!isEmpty && results.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-muted-foreground" role="status">{t("noSearchResults")}</p>
        ) : null}
      </div>
    </>
  )
}

export { CommunityInbox }
