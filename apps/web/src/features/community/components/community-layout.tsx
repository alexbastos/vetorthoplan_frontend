import type { ReactNode } from "react"

import styles from "./community-layout.module.css"

type CommunityLayoutProps = {
  inbox: ReactNode
  conversation: ReactNode
  hasConversations: boolean
  mobileConversationOpen: boolean
  profileSlotRef: (element: HTMLDivElement | null) => void
}

function CommunityLayout({ inbox, conversation, hasConversations, mobileConversationOpen, profileSlotRef }: CommunityLayoutProps) {
  return (
    <div className={styles.workspace}>
      <div className={styles.messages} data-empty={!hasConversations} data-mobile-conversation-open={mobileConversationOpen}>
        <div className={styles.inbox}>{inbox}</div>
        <div className={styles.conversation}>{conversation}</div>
      </div>
      <div className={styles.profileSlot} ref={profileSlotRef} />
    </div>
  )
}

export { CommunityLayout }
