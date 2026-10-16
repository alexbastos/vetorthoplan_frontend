"use client"

import { TriangleLoader } from "@/components/ui/triangle-loader"
import { useTranslations } from "next-intl"

import type { LoginHandoffState } from "./login-handoff-provider"
import { useLoginHandoffAnimation } from "./use-login-handoff-animation"

type LoginHandoffOverlayProps = {
  onExitComplete: () => void
  state: LoginHandoffState
}

function LoginHandoffOverlay({ onExitComplete, state }: LoginHandoffOverlayProps) {
  const t = useTranslations("auth.handoff")
  const overlayRef = useLoginHandoffAnimation({ onExitComplete, state })

  if (state === "idle") {
    return null
  }

  return (
    <section
      ref={overlayRef}
      aria-atomic="true"
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex min-h-dvh flex-col items-center justify-center gap-4 bg-capta-surface-card px-6 text-center opacity-0"
      role="status"
    >
      <TriangleLoader size={52} />
      <div className="relative h-5 w-72 text-overline text-capta-text-secondary">
        <p className="absolute inset-0 flex items-center justify-center whitespace-nowrap" data-login-handoff-status="authenticating">
          {t("authenticating")}
        </p>
        <p className="absolute inset-0 flex items-center justify-center whitespace-nowrap opacity-0" data-login-handoff-status="validating">
          {t("validating")}
        </p>
        <p className="absolute inset-0 flex items-center justify-center whitespace-nowrap opacity-0" data-login-handoff-status="preparing">
          {t("preparing")}
        </p>
      </div>
    </section>
  )
}

export { LoginHandoffOverlay }
