"use client"

import { useTranslations } from "next-intl"
import { SquarePen } from "lucide-react"
import { useLayoutEffect, useRef, useState, type MouseEvent } from "react"

import { Button } from "@/components/ui/button"

import { demoConversations, demoMembers, rafaelHistory, type CommunityMessage, type CommunityMessageQuote, type ConversationId, type DemoConversation, type DemoMember } from "../lib/demo-conversations"
import { CommunityConversation } from "./community-conversation"
import conversationStyles from "./community-conversation.module.css"
import { CommunityEmptyState } from "./community-empty-state"
import { CommunityInbox } from "./community-inbox"
import { CommunityLayout } from "./community-layout"
import { CommunityNewConversationDialog } from "./community-new-conversation-dialog"
import { CommunitySafetyNotice } from "./community-safety-notice"

function CommunityPage({ conversations = demoConversations }: { conversations?: readonly DemoConversation[] }) {
  const t = useTranslations("community")
  const [selectedId, setSelectedId] = useState<ConversationId | undefined>(conversations[0]?.id)
  const [pendingMember, setPendingMember] = useState<DemoMember>()
  const [newConversationOpen, setNewConversationOpen] = useState(false)
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false)
  const [profileSlot, setProfileSlot] = useState<HTMLDivElement | null>(null)
  const [unread, setUnread] = useState<ReadonlySet<ConversationId>>(() => new Set())
  const [muted, setMuted] = useState<ReadonlySet<ConversationId>>(() => new Set())
  const [drafts, setDrafts] = useState<Partial<Record<ConversationId, string>>>({})
  const [replies, setReplies] = useState<Partial<Record<ConversationId, CommunityMessageQuote>>>({})
  const [likes, setLikes] = useState<Partial<Record<ConversationId, ReadonlySet<string>>>>({})
  const [sentMessages, setSentMessages] = useState<Partial<Record<ConversationId, CommunityMessage[]>>>({})
  const selectedButton = useRef<HTMLButtonElement>(null)
  const newConversationButton = useRef<HTMLButtonElement>(null)
  const dialogOpener = useRef<HTMLButtonElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const inboxScroll = useRef<HTMLDivElement>(null)
  const inboxScrollTop = useRef(0)
  const restoreFocus = useRef(false)
  const createdConversations = demoMembers.flatMap((member) => {
    if (conversations.some(({ id }) => id === member.id)) return []
    const firstMessage = sentMessages[member.id]?.[0]
    return firstMessage ? [{ ...member, updatedAt: firstMessage.sentAt }] : []
  })
  const inboxConversations = [...conversations, ...createdConversations]
  const conversation = pendingMember ?? inboxConversations.find(({ id }) => id === selectedId) ?? inboxConversations[0]
  const activeId = conversation?.id
  const initialMessages: Partial<Record<ConversationId, CommunityMessage[]>> = {
    marina: [{ id: "welcome", text: t("demo.marina"), sentAt: demoConversations[0].updatedAt, outgoing: false }],
    rafael: [
      ...rafaelHistory.map(({ key, sentAt, outgoing }) => ({ id: key, text: t(`history.${key}`), sentAt, outgoing })),
      { id: "last", text: t("demo.rafael"), sentAt: demoConversations[1].updatedAt, outgoing: false },
    ],
    beatriz: [{ id: "welcome", text: t("demo.beatriz"), sentAt: demoConversations[2].updatedAt, outgoing: false }],
  }
  const latestMessages: Partial<Record<ConversationId, CommunityMessage>> = {}
  for (const { id } of inboxConversations) {
    latestMessages[id] = sentMessages[id]?.at(-1) ?? initialMessages[id]?.at(-1)
  }
  const orderedConversations = inboxConversations.sort((a, b) =>
    (latestMessages[b.id]?.sentAt ?? b.updatedAt).localeCompare(latestMessages[a.id]?.sentAt ?? a.updatedAt)
  )
  const draft = activeId ? drafts[activeId] ?? "" : ""
  const seededMessages = activeId && conversations.some(({ id }) => id === activeId) ? initialMessages[activeId] : undefined

  useLayoutEffect(() => {
    if (mobileConversationOpen) {
      if (backButton.current?.getClientRects().length) backButton.current.focus()
    } else if (restoreFocus.current) {
      restoreFocus.current = false
      if (inboxScroll.current) inboxScroll.current.scrollTop = inboxScrollTop.current
      const target = selectedButton.current ?? newConversationButton.current
      target?.focus({ preventScroll: true })
    }
  }, [mobileConversationOpen])

  function openConversation(id: ConversationId) {
    inboxScrollTop.current = inboxScroll.current?.scrollTop ?? 0
    setSelectedId(id)
    setPendingMember(undefined)
    setMobileConversationOpen(true)
    setUnread((current) => {
      if (!current.has(id)) return current
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  function openNewConversation(event: MouseEvent<HTMLButtonElement>) {
    dialogOpener.current = event.currentTarget
    setNewConversationOpen(true)
  }

  function selectMember(member: DemoMember) {
    openConversation(member.id)
    if (!inboxConversations.some(({ id }) => id === member.id)) setPendingMember(member)
  }

  function toggleUnread(id: ConversationId) {
    setUnread((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function sendMessage(id: ConversationId) {
    const text = draft.trim()
    if (!text) return
    const sentAt = new Date().toISOString()
    setSentMessages((current) => {
      const history = current[id] ?? []
      const message: CommunityMessage = { id: `local-${history.length}`, text, sentAt, outgoing: true, replyTo: replies[id] }
      return { ...current, [id]: [...history, message] }
    })
    setDrafts((current) => ({ ...current, [id]: "" }))
    setReplies((current) => ({ ...current, [id]: undefined }))
    setPendingMember(undefined)
  }

  function toggleLike(id: ConversationId, messageId: string) {
    setLikes((current) => {
      const next = new Set(current[id])
      if (!next.delete(messageId)) next.add(messageId)
      return { ...current, [id]: next }
    })
  }

  return (
    <>
      <CommunityLayout
        hasConversations={inboxConversations.length > 0}
        mobileConversationOpen={mobileConversationOpen}
        profileSlotRef={setProfileSlot}
        inbox={
          <CommunityInbox
            conversations={orderedConversations}
            latestMessages={latestMessages}
            muted={muted}
            newConversationButton={newConversationButton}
            onNewConversation={openNewConversation}
            onSelect={openConversation}
            onToggleUnread={toggleUnread}
            returnFocusRef={selectedButton}
            scrollRef={inboxScroll}
            selectedId={activeId}
            unread={unread}
          />
        }
        conversation={conversation ? (
          <CommunityConversation
            backButton={backButton}
            composer={composer}
            conversation={conversation}
            draft={draft}
            key={conversation.id}
            likedMessages={likes[conversation.id]}
            messages={[...(seededMessages ?? []), ...(sentMessages[conversation.id] ?? [])]}
            muted={muted.has(conversation.id)}
            pending={Boolean(pendingMember)}
            profileSlot={profileSlot}
            replyTo={replies[conversation.id]}
            onBack={() => {
              restoreFocus.current = true
              setPendingMember(undefined)
              setMobileConversationOpen(false)
            }}
            onDraftChange={(value) => setDrafts((current) => ({ ...current, [conversation.id]: value }))}
            onMarkUnread={() => setUnread((current) => new Set(current).add(conversation.id))}
            onReplyChange={(reply) => setReplies((current) => ({ ...current, [conversation.id]: reply }))}
            onSend={() => sendMessage(conversation.id)}
            onToggleLike={(messageId) => toggleLike(conversation.id, messageId)}
            onToggleMute={() => setMuted((current) => {
              const next = new Set(current)
              if (!next.delete(conversation.id)) next.add(conversation.id)
              return next
            })}
          />
        ) : (
          <div className={conversationStyles.history}>
            <CommunitySafetyNotice />
            <CommunityEmptyState
              action={
                <Button aria-haspopup="dialog" className="rounded-full" onClick={openNewConversation} size="sm" type="button">
                  <SquarePen aria-hidden="true" />
                  {t("newConversation.title")}
                </Button>
              }
              variant="inbox"
            />
          </div>
        )}
      />
      <CommunityNewConversationDialog
        composer={composer}
        onOpenChange={setNewConversationOpen}
        onSelect={selectMember}
        open={newConversationOpen}
        returnFocus={dialogOpener}
      />
    </>
  )
}

export { CommunityPage }
