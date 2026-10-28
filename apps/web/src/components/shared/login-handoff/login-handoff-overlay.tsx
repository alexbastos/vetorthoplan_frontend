"use client"

import { useTranslations } from "next-intl"

import type { LoginHandoffLabels, LoginHandoffPhase } from "./login-handoff-provider"
import { LoginHandoffPawLoader } from "./login-handoff-paw-loader"
import { LoginHandoffStatusText } from "./login-handoff-status-text"
import { useLoginHandoffAnimation } from "./use-login-handoff-animation"
import styles from "./login-handoff-overlay.module.css"

type LoginHandoffOverlayProps = {
  labels?: LoginHandoffLabels
  onDismissComplete: () => void
  onLoaderExitComplete: () => void
  onLoaderSettled: () => void
  state: LoginHandoffPhase
}

function LoginHandoffOverlay({
  labels,
  onDismissComplete,
  onLoaderExitComplete,
  onLoaderSettled,
  state,
}: LoginHandoffOverlayProps) {
  const t = useTranslations("auth.handoff")
  const messages = [
    labels?.authenticating ?? t("authenticating"),
    labels?.validating ?? t("validating"),
    labels?.preparing ?? t("preparing"),
  ]
  const { contentRef, messageIndex, messageRef, overlayRef } = useLoginHandoffAnimation({
    messageCount: messages.length,
    onDismissComplete,
    onLoaderExitComplete,
    state,
  })

  if (state === "idle") {
    return null
  }

  return (
    <section
      ref={overlayRef}
      aria-atomic="true"
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-workspace px-6 text-center opacity-0"
      data-handoff-state={state}
      data-login-handoff-overlay
      role="status"
    >
      <div ref={contentRef} className={styles.content} data-login-handoff-content>
        <LoginHandoffPawLoader
          onSettled={onLoaderSettled}
          settle={state === "awaiting-destination" || state === "exiting-loader" || state === "entering-destination"}
          size={104}
        />
        <div className={styles.status}>
          <p ref={messageRef} className={styles.message} data-login-handoff-status>
            <LoginHandoffStatusText>{messages[messageIndex]}</LoginHandoffStatusText>
          </p>
        </div>
      </div>
    </section>
  )
}

export { LoginHandoffOverlay }
