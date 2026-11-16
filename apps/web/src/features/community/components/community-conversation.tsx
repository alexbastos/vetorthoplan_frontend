import { ArrowDown, ArrowLeft, Bell, ChevronDown, ChevronUp, Copy, Ellipsis, Reply, Search, ThumbsUp, UserRound, X } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"

import { AppUserAvatar } from "@/components/shared/app-shell/app-user-avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/lib/notifications"

import type { CommunityMessage, CommunityMessageQuote, DemoMember } from "../lib/demo-conversations"
import { normalizeSearchText } from "../lib/normalize-search-text"
import { CommunityComposer } from "./community-composer"
import { CommunityEmptyState } from "./community-empty-state"
import { CommunityProfile } from "./community-profile"
import { CommunitySafetyNotice } from "./community-safety-notice"
import styles from "./community-conversation.module.css"

type CommunityConversationProps = {
  conversation: DemoMember
  messages: readonly CommunityMessage[]
  likedMessages?: ReadonlySet<string>
  replyTo?: CommunityMessageQuote
  draft: string
  muted: boolean
  pending: boolean
  composer: RefObject<HTMLTextAreaElement | null>
  profileSlot: HTMLDivElement | null
  backButton: RefObject<HTMLButtonElement | null>
  onBack: () => void
  onDraftChange: (value: string) => void
  onMarkUnread: () => void
  onReplyChange: (reply: CommunityMessageQuote | undefined) => void
  onSend: () => void
  onToggleLike: (messageId: string) => void
  onToggleMute: () => void
}

function CommunityConversation({ conversation, messages, likedMessages, replyTo, draft, muted, pending, composer, profileSlot, backButton, onBack, onDraftChange, onMarkUnread, onReplyChange, onSend, onToggleLike, onToggleMute }: CommunityConversationProps) {
  const t = useTranslations("community")
  const actions = useTranslations("common.actions")
  const format = useFormatter()
  const profileId = useId()
  const searchId = useId()
  const profileButton = useRef<HTMLButtonElement>(null)
  const profileCloseButton = useRef<HTMLButtonElement>(null)
  const searchButton = useRef<HTMLButtonElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  const historyContentRef = useRef<HTMLDivElement>(null)
  const followLatest = useRef(true)
  const previousLastMessage = useRef<string | undefined>(undefined)
  const readingPosition = useRef<{ row?: HTMLElement; offset: number; scrollTop: number; atEnd: boolean } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [resultIndex, setResultIndex] = useState(0)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [quotedHighlight, setQuotedHighlight] = useState<{ id: string } | null>(null)
  const normalizedQuery = normalizeSearchText(query.trim())
  const results = normalizedQuery ? messages.filter(({ text }) => normalizeSearchText(text).includes(normalizedQuery)) : []
  const activeIndex = Math.min(resultIndex, results.length - 1)
  const activeResultId = results[activeIndex]?.id
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const lastMessage = messages.at(-1)
  const lastMessageId = lastMessage?.id
  const lastMessageOutgoing = lastMessage?.outgoing
  const days: { date: string; label: string; messages: CommunityMessage[] }[] = []

  for (const message of messages) {
    const date = format.dateTime(new Date(message.sentAt), { day: "numeric", month: "long", year: "numeric", weekday: "long" })
    const day = days.at(-1)
    if (day && day.label === date) day.messages.push(message)
    else days.push({ date: message.sentAt, label: date, messages: [message] })
  }

  useLayoutEffect(() => {
    const history = historyRef.current
    if (!history) return
    const follow = () => {
      if (followLatest.current && previousLastMessage.current !== undefined) history.scrollTop = history.scrollHeight
    }
    follow()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(follow)
    observer.observe(history)
    if (historyContentRef.current) observer.observe(historyContentRef.current)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const history = historyRef.current
    if (!history || previousLastMessage.current === lastMessageId) return
    previousLastMessage.current = lastMessageId
    if (followLatest.current || lastMessageOutgoing) {
      followLatest.current = true
      history.scrollTop = history.scrollHeight
      setHasNewMessages(false)
    } else {
      setHasNewMessages(true)
    }
  }, [lastMessageId, lastMessageOutgoing])

  useLayoutEffect(() => {
    const history = historyRef.current
    const position = readingPosition.current
    if (!history || !position) return
    readingPosition.current = null
    const nextTop = position.row
      ? history.scrollTop + position.row.getBoundingClientRect().top - history.getBoundingClientRect().top - position.offset
      : position.scrollTop
    history.scrollTop = position.atEnd ? history.scrollHeight : nextTop
    if (profileOpen) profileCloseButton.current?.focus({ preventScroll: true })
    else profileButton.current?.focus({ preventScroll: true })
  }, [profileOpen])

  useLayoutEffect(() => {
    if (searchOpen) searchInput.current?.focus({ preventScroll: true })
  }, [searchOpen])

  useLayoutEffect(() => {
    if (!activeResultId) {
      setHighlighted(null)
      return
    }
    const history = historyRef.current
    const row = [...(history?.querySelectorAll<HTMLElement>("[data-message-id]") ?? [])]
      .find((element) => element.dataset.messageId === activeResultId)
    if (history && row) {
      const bounds = history.getBoundingClientRect()
      const message = row.getBoundingClientRect()
      followLatest.current = false
      if (message.top < bounds.top) history.scrollTop += message.top - bounds.top
      else if (message.bottom > bounds.bottom) history.scrollTop += Math.min(message.top - bounds.top, message.bottom - bounds.bottom)
    }
    setHighlighted(activeResultId)
    const timeout = window.setTimeout(() => setHighlighted(null), 2000)
    return () => window.clearTimeout(timeout)
  }, [activeResultId, normalizedQuery])

  useLayoutEffect(() => {
    if (!quotedHighlight) return
    const timeout = window.setTimeout(() => setQuotedHighlight(null), 2400)
    return () => window.clearTimeout(timeout)
  }, [quotedHighlight])

  function jumpToMessage(id: string) {
    const history = historyRef.current
    const row = [...(history?.querySelectorAll<HTMLElement>("[data-message-id]") ?? [])]
      .find((element) => element.dataset.messageId === id)
    if (!history || !row) return

    const bounds = history.getBoundingClientRect()
    const message = row.getBoundingClientRect()
    const centerOffset = Math.max(0, (history.clientHeight - message.height) / 2)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    followLatest.current = false
    row.focus({ preventScroll: true })
    history.scrollTo({
      top: history.scrollTop + message.top - bounds.top - centerOffset,
      behavior: reduceMotion ? "instant" : "smooth",
    })
    setQuotedHighlight({ id })
  }

  function toggleProfile() {
    const history = historyRef.current
    if (history) {
      const bounds = history.getBoundingClientRect()
      const row = [...history.querySelectorAll<HTMLElement>("[data-message-id]")]
        .find((element) => {
          const message = element.getBoundingClientRect()
          return message.bottom > bounds.top && message.top < bounds.bottom
        })
      readingPosition.current = {
        row, offset: row ? row.getBoundingClientRect().top - bounds.top : 0,
        scrollTop: history.scrollTop, atEnd: followLatest.current,
      }
    }
    setProfileOpen(!profileOpen)
  }

  function closeSearch() {
    const history = historyRef.current
    if (history) followLatest.current = history.scrollHeight - history.clientHeight - history.scrollTop <= 48
    setSearchOpen(false)
    setQuery("")
    setResultIndex(0)
    searchButton.current?.focus({ preventScroll: true })
  }

  function stepResult(direction: number) {
    if (results.length) setResultIndex((activeIndex + direction + results.length) % results.length)
  }

  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t("messageCopied"), { description: t("messageCopiedDescription") })
    } catch {
      toast.error(t("copyFailed"), { description: t("copyFailedDescription") })
    }
  }

  return (
    <div
      className={styles.conversationWorkspace}
      data-profile-open={profileOpen}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented || (event.target as HTMLElement).closest("[role=dialog], [role=menu]")) return
        if (profileOpen) toggleProfile()
        else if (searchOpen) closeSearch()
      }}
    >
      <div className={styles.thread}>
        <header className={styles.header}>
          <div className="flex min-w-0 items-center gap-2 lg:gap-3">
            <button
              aria-label={t("backToConversations")}
              className={`grid size-9 shrink-0 place-items-center rounded-full text-content-secondary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring ${pending ? "" : "lg:hidden"}`}
              onClick={onBack}
              ref={backButton}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.5} />
            </button>
            <AppUserAvatar avatarUrl={null} className="size-9 rounded-full text-[11px]" initials={conversation.initials} />
            <div className="min-w-0">
              <h2 className="truncate text-[14px] leading-tight font-semibold text-foreground">{conversation.name}</h2>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t(`specialties.${conversation.id}`)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button aria-controls={searchOpen ? searchId : undefined} aria-expanded={searchOpen} aria-label={t("searchMessages")} className={styles.action} disabled={pending} onClick={searchOpen ? closeSearch : () => setSearchOpen(true)} ref={searchButton} title={t("searchMessages")} type="button">
              <Search aria-hidden="true" size={15} strokeWidth={1.5} />
            </button>
            <button aria-controls={profileOpen ? profileId : undefined} aria-expanded={profileOpen} aria-label={t("viewProfile")} className={`${styles.action} ${styles.profileAction}`} onClick={toggleProfile} ref={profileButton} title={t("viewProfile")} type="button">
              <UserRound aria-hidden="true" size={15} strokeWidth={1.5} />
            </button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger aria-label={t("moreOptions")} className={styles.action} disabled={pending} title={t("moreOptions")} type="button">
                <Ellipsis aria-hidden="true" size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-1rem)] p-1.5">
                <ConversationMenuItem description={t("markUnreadDescription")} onSelect={onMarkUnread} title={t("markUnread")}>
                  <svg aria-hidden="true" className="size-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                    <path d="M3.5 9c0-3 1.5-4.5 4.5-4.5h8c3 0 4.5 1.5 4.5 4.5v6c0 3-1.5 4.5-4.5 4.5H8c-3 0-4.5-1.5-4.5-4.5V9Z" />
                    <path d="m4 7 5.8 4.6a3.5 3.5 0 0 0 4.4 0L20 7" />
                  </svg>
                </ConversationMenuItem>
                <ConversationMenuItem
                  description={t(muted ? "unmuteConversationDescription" : "muteConversationDescription")}
                  onSelect={onToggleMute}
                  title={t(muted ? "unmuteConversation" : "muteConversation")}
                >
                  {muted ? (
                    <Bell aria-hidden="true" className="size-[15px]" strokeWidth={1.5} />
                  ) : (
                    <svg aria-hidden="true" className="size-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}>
                      <path d="M19.5229 19.5229C18.4076 20.6761 15.4604 21.5 12 21.5C7.58172 21.5 4 20.1569 4 18.5C4 16.8431 7.58172 15.5 12 15.5C13.4057 15.5 14.7268 15.636 15.8747 15.8747" />
                      <path d="M13 18.5H11M2 2L22 22" />
                      <path d="M4 18.5011L5.65098 7.93407C5.74763 7.3155 5.93052 6.72907 6.18626 6.18626M7.94277 3.94277C9.05576 3.03642 10.473 2.5 12 2.5C15.166 2.5 17.8603 4.80601 18.349 7.93407L19.5369 15.5369" />
                    </svg>
                  )}
                </ConversationMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {searchOpen ? (
          <div className={styles.historySearch} id={searchId}>
            <Search aria-hidden="true" className="shrink-0 text-muted-foreground" size={15} />
            <input
              aria-label={t("searchMessages")}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
              onChange={(event) => {
                setQuery(event.target.value)
                setResultIndex(0)
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return
                if (event.key === "Enter") stepResult(event.shiftKey ? -1 : 1)
                if (event.key === "Escape") {
                  event.preventDefault()
                  closeSearch()
                }
              }}
              placeholder={t("searchMessages")}
              ref={searchInput}
              type="search"
              value={query}
            />
            <span aria-live="polite" className="shrink-0 text-[11px] text-muted-foreground">
              {normalizedQuery ? t("searchResults", { current: activeIndex + 1, total: results.length }) : null}
            </span>
            <button aria-label={t("previousResult")} className={styles.action} disabled={results.length < 2} onClick={() => stepResult(-1)} type="button"><ChevronUp aria-hidden="true" size={15} /></button>
            <button aria-label={t("nextResult")} className={styles.action} disabled={results.length < 2} onClick={() => stepResult(1)} type="button"><ChevronDown aria-hidden="true" size={15} /></button>
            <button aria-label={actions("close")} className={styles.action} onClick={closeSearch} type="button"><X aria-hidden="true" size={15} /></button>
          </div>
        ) : null}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            aria-label={t("messageHistory")}
            className={styles.history}
            onScroll={(event) => {
              const history = event.currentTarget
              followLatest.current = !normalizedQuery && history.scrollHeight - history.clientHeight - history.scrollTop <= 48
              if (followLatest.current) setHasNewMessages(false)
            }}
            ref={historyRef}
            role="log"
            tabIndex={0}
          >
            <div className={`flex shrink-0 flex-col gap-3 ${days.length === 0 ? "grow" : ""}`} ref={historyContentRef}>
              <CommunitySafetyNotice />
              {days.length === 0 ? <CommunityEmptyState variant="conversation" /> : null}
              {days.map((day) => (
                <div className="flex shrink-0 flex-col gap-3" key={day.date}>
                  <div className="flex items-center gap-3 py-1 text-[11px] text-muted-foreground">
                    <span aria-hidden="true" className="h-px flex-1 bg-[var(--community-divider)]" />
                    <span>{day.label}</span>
                    <span aria-hidden="true" className="h-px flex-1 bg-[var(--community-divider)]" />
                  </div>
                  {day.messages.map((message) => (
                    <div className={`${styles.messageRow} flex items-end gap-2 outline-none ${message.outgoing ? "justify-end" : "justify-start"}`} data-message-id={message.id} key={message.id} tabIndex={-1}>
                      {message.outgoing ? null : (
                        <AppUserAvatar avatarUrl={null} className="mb-8 size-[26px] rounded-full text-[9px]" initials={conversation.initials} />
                      )}
                      <div className={`flex min-w-0 max-w-[75%] flex-col ${message.outgoing ? "items-end" : "items-start"}`}>
                        <p className="mb-1 px-1 text-[11px] text-muted-foreground">
                          {message.outgoing ? t("you") : conversation.name} ·{" "}
                          <time dateTime={message.sentAt}>{format.dateTime(new Date(message.sentAt), { hour: "numeric", minute: "2-digit" })}</time>
                        </p>
                        {message.replyTo ? (
                          <button
                            className="mb-1 w-fit max-w-[min(100%,16rem)] cursor-pointer rounded-lg bg-muted px-2.5 py-1.5 text-start hover:bg-hover focus-visible:bg-hover focus-visible:outline-1 focus-visible:outline-ring"
                            onClick={() => {
                              if (message.replyTo) jumpToMessage(message.replyTo.id)
                            }}
                            title={t("goToQuotedMessage")}
                            type="button"
                          >
                            <span className="block truncate text-[11px] leading-tight font-medium text-content-secondary">{message.replyTo.outgoing ? t("you") : conversation.name}</span>
                            <span className="mt-0.5 block truncate text-[11px] leading-snug text-muted-foreground">{message.replyTo.text}</span>
                          </button>
                        ) : null}
                        <div className={`${styles.bubble} max-w-full rounded-xl px-4 py-2.5 text-[13px] leading-relaxed ${message.outgoing ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`} data-highlighted={highlighted === message.id || quotedHighlight?.id === message.id}>
                          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.text}</p>
                        </div>
                        <div className={styles.messageActions} role="group" aria-label={t("messageActions")}>
                          <button aria-label={t("likeMessage")} aria-pressed={likedMessages?.has(message.id) ?? false} className={styles.messageAction} onClick={() => onToggleLike(message.id)} title={t("likeMessage")} type="button">
                            <ThumbsUp aria-hidden="true" size={15} strokeWidth={1.5} />
                          </button>
                          <button aria-label={t("copyMessage")} className={styles.messageAction} onClick={() => { void copyMessage(message.text) }} title={t("copyMessage")} type="button">
                            <Copy aria-hidden="true" size={15} strokeWidth={1.5} />
                          </button>
                          <button
                            aria-label={t("replyToMessage")}
                            className={styles.messageAction}
                            onClick={() => {
                              onReplyChange({ id: message.id, text: message.text, outgoing: message.outgoing })
                              composer.current?.focus({ preventScroll: true })
                            }}
                            title={t("replyToMessage")}
                            type="button"
                          >
                            <Reply aria-hidden="true" size={15} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {hasNewMessages ? (
            <button
              className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] text-foreground shadow-sm"
              onClick={() => {
                followLatest.current = true
                const history = historyRef.current
                if (history) {
                  history.scrollTop = history.scrollHeight
                  history.focus({ preventScroll: true })
                }
                setHasNewMessages(false)
              }}
              type="button"
            >
              <ArrowDown aria-hidden="true" size={14} />
              {t("newMessages")}
            </button>
          ) : null}
        </div>
        <CommunityComposer
          draft={draft}
          inputRef={composer}
          name={conversation.name}
          onCancelReply={() => onReplyChange(undefined)}
          onDraftChange={onDraftChange}
          onSend={onSend}
          replyTo={replyTo}
        />
      </div>
      {profileOpen && profileSlot ? createPortal(
        <CommunityProfile closeButton={profileCloseButton} conversation={conversation} id={profileId} onClose={toggleProfile} />,
        profileSlot,
      ) : null}
    </div>
  )
}

function ConversationMenuItem({ children, description, onSelect, title }: {
  children: ReactNode
  description: string
  onSelect: () => void
  title: string
}) {
  return (
    <DropdownMenuItem className="cursor-pointer items-start gap-2.5 px-2 py-2.5 text-[13px]" onSelect={onSelect} textValue={title}>
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-content-secondary">{children}</span>
      <span className="min-w-0">
        <span className="block leading-tight text-foreground">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{description}</span>
      </span>
    </DropdownMenuItem>
  )
}

export { CommunityConversation }
