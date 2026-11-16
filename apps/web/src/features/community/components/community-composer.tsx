import { ArrowUp, Mic, Paperclip, Reply, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react"

import type { CommunityMessageQuote } from "../lib/demo-conversations"
import styles from "./community-conversation.module.css"

type CommunityComposerProps = {
  name: string
  draft: string
  inputRef: RefObject<HTMLTextAreaElement | null>
  replyTo?: CommunityMessageQuote
  onCancelReply: () => void
  onDraftChange: (value: string) => void
  onSend: () => void
}

function CommunityComposer({ name, draft, inputRef, replyTo, onCancelReply, onDraftChange, onSend }: CommunityComposerProps) {
  const t = useTranslations("community")
  const composerRef = useRef<HTMLDivElement>(null)
  const canSend = draft.trim().length > 0

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return
    const container = input.parentElement
    if (!container) return

    function resize() {
      if (!input || !input.clientWidth) return
      input.style.height = "auto"
      input.style.height = `${input.scrollHeight}px`
    }

    resize()
    if (typeof ResizeObserver === "undefined") return

    let width = container.clientWidth
    const observer = new ResizeObserver(() => {
      const nextWidth = container.clientWidth
      if (nextWidth === width) return
      width = nextWidth
      resize()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [draft, inputRef])

  useEffect(() => {
    const composer = composerRef.current
    const viewport = window.visualViewport
    if (!composer || !viewport) return

    function syncKeyboardInset() {
      const inputFocused = document.activeElement === inputRef.current
      const inset = inputFocused && viewport?.scale === 1
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0
      composer?.style.setProperty("--community-keyboard-inset", `${inset}px`)
    }

    viewport.addEventListener("resize", syncKeyboardInset)
    viewport.addEventListener("scroll", syncKeyboardInset)
    composer.addEventListener("focusin", syncKeyboardInset)
    composer.addEventListener("focusout", syncKeyboardInset)
    return () => {
      viewport.removeEventListener("resize", syncKeyboardInset)
      viewport.removeEventListener("scroll", syncKeyboardInset)
      composer.removeEventListener("focusin", syncKeyboardInset)
      composer.removeEventListener("focusout", syncKeyboardInset)
    }
  }, [inputRef])

  return (
    <div className={styles.composer} ref={composerRef}>
      {replyTo ? (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
          <Reply aria-hidden="true" className="shrink-0 text-content-secondary" size={15} strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-foreground">{t("replyingTo", { name: replyTo.outgoing ? t("you") : name })}</p>
            <p className="truncate text-[12px] text-muted-foreground">{replyTo.text}</p>
          </div>
          <button
            aria-label={t("cancelReply")}
            className={styles.messageAction}
            onClick={() => {
              onCancelReply()
              inputRef.current?.focus({ preventScroll: true })
            }}
            title={t("cancelReply")}
            type="button"
          >
            <X aria-hidden="true" size={15} strokeWidth={1.5} />
          </button>
        </div>
      ) : null}
      <form
        className={styles.composerSurface}
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSend) return
          onSend()
          inputRef.current?.focus({ preventScroll: true })
        }}
      >
        <textarea
          aria-label={t("writeMessage", { name })}
          className={`${styles.input} outline-none`}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={t("writeMessage", { name })}
          ref={inputRef}
          rows={1}
          value={draft}
        />
        <div className="flex items-center justify-between gap-2">
          <button aria-label={t("attachFiles")} className={styles.action} disabled title={t("attachFiles")} type="button">
            <Paperclip aria-hidden="true" size={16} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-1.5">
            <button aria-label={t("recordAudio")} className={styles.action} disabled title={t("recordAudio")} type="button">
              <Mic aria-hidden="true" size={16} strokeWidth={1.5} />
            </button>
            <button
              aria-label={t("sendMessage")}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:bg-transparent disabled:text-content-disabled"
              disabled={!canSend}
              title={t("sendMessage")}
              type="submit"
            >
              <ArrowUp aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export { CommunityComposer }
