"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { LoginHandoffPawLoader } from "@/components/shared/login-handoff/login-handoff-paw-loader"
import { LoginHandoffStatusText } from "@/components/shared/login-handoff/login-handoff-status-text"
import handoffStyles from "@/components/shared/login-handoff/login-handoff-overlay.module.css"
import { authBffClient } from "@/features/auth/services/auth-bff-client"
import { AppVersion } from "@/components/shared/app-version"

type RefreshState = "checking" | "unavailable"

// A renovação ocorre no Route Handler para persistir os cookies HttpOnly rotacionados.
function ProtectedSessionRefreshGate() {
  const t = useTranslations("common.session")
  const router = useRouter()
  const [state, setState] = useState<RefreshState>("checking")

  useEffect(() => {
    let active = true

    async function refreshSession() {
      try {
        const response = await authBffClient.session()

        if (response.ok) {
          router.refresh()
          return
        }

        if (response.status === 401) {
          const from = `${window.location.pathname}${window.location.search}${window.location.hash}`
          router.replace(`/login?from=${encodeURIComponent(from)}`)
          return
        }

        if (active) {
          setState("unavailable")
        }
      } catch {
        if (active) {
          setState("unavailable")
        }
      }
    }

    void refreshSession()

    return () => {
      active = false
    }
  }, [router])

  if (state === "unavailable") {
    return <ProtectedAreaUnavailable />
  }

  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center bg-workspace px-6 text-center"
      role="status"
    >
      <div className={handoffStyles.content}>
        <LoginHandoffPawLoader size={104} />
        <div className={handoffStyles.status}>
          <p className={handoffStyles.message}>
            <LoginHandoffStatusText>{t("checking")}</LoginHandoffStatusText>
          </p>
        </div>
      </div>
    </main>
  )
}

function ProtectedAreaUnavailable() {
  const t = useTranslations("common.session")
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <section aria-labelledby="session-unavailable-title" className="w-full max-w-md space-y-3 text-center">
        <h1 id="session-unavailable-title" className="text-heading-4 text-foreground">
          {t("unavailableTitle")}
        </h1>
        <p className="text-ui text-content-secondary">
          {t("unavailableDescription")}
        </p>
        <p className="text-xs text-content-secondary"><AppVersion /></p>
      </section>
    </main>
  )
}

export { ProtectedAreaUnavailable, ProtectedSessionRefreshGate }
