"use client"

import { useTranslations } from "next-intl"

import { ShimmerText } from "@/components/ui/shimmer-text"

import type { LoginHandoffLabels, LoginHandoffPhase } from "./login-handoff-provider"
import { LoginHandoffPawLoader } from "./login-handoff-paw-loader"
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
            <ShimmerText className={styles.statusLabel}>{messages[messageIndex]}</ShimmerText>
            <svg
              aria-hidden="true"
              className={styles.statusDots}
              fill="none"
              viewBox="0 0 18 6"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle className={styles.statusDot} cx="3" cy="3" r="1.25" />
              <circle className={styles.statusDot} cx="9" cy="3" r="1.25" />
              <circle className={styles.statusDot} cx="15" cy="3" r="1.25" />
            </svg>
          </p>
        </div>
      </div>
    </section>
  )
}

export { LoginHandoffOverlay }
