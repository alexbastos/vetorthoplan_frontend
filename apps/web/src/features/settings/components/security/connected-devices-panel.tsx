"use client"

import { AlertCircle, MonitorSmartphone } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ConnectedDeviceRow } from "./connected-device-row"
import { RevokeSessionDialog } from "./revoke-session-dialog"
import { useConnectedDevices } from "../../hooks/use-connected-devices"
import type { ActiveSession } from "../../types/settings"

type ConnectedDevicesPanelProps = {
  isActive: boolean
}

const INITIAL_VISIBLE_SESSIONS = 4

function ConnectedDevicesPanel({ isActive }: ConnectedDevicesPanelProps) {
  const t = useTranslations("settings.devices")
  const tActions = useTranslations("common.actions")
  const { activeSessions, completeSessionRevocation, isLoading, isRevoking, loadError, revokeSession, revokingSessionId, retry } = useConnectedDevices({ enabled: isActive })
  const revocationLockRef = useRef(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [exitingSessionId, setExitingSessionId] = useState<string>()
  const [sessionToRevoke, setSessionToRevoke] = useState<ActiveSession | null>(null)
  const orderedSessions = [...activeSessions].sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent))
  const visibleSessions = isExpanded ? orderedSessions : orderedSessions.slice(0, INITIAL_VISIBLE_SESSIONS)
  const hasHiddenSessions = orderedSessions.length > INITIAL_VISIBLE_SESSIONS

  function requestSessionRevocation(session: ActiveSession) {
    if (session.isCurrent || revocationLockRef.current || exitingSessionId) {
      return
    }

    setSessionToRevoke(session)
  }

  async function confirmSessionRevocation() {
    if (!sessionToRevoke || sessionToRevoke.isCurrent || revocationLockRef.current) {
      return
    }

    revocationLockRef.current = true

    try {
      await revokeSession(sessionToRevoke.id)
      setExitingSessionId(sessionToRevoke.id)
      setSessionToRevoke(null)
      toast.success(t("revoked"))
    } catch (error) {
      toast.error(t("revokeError"), { description: error instanceof Error ? error.message : undefined })
    } finally {
      revocationLockRef.current = false
    }
  }

  const handleExitComplete = useCallback((sessionId: string) => {
    completeSessionRevocation(sessionId)
    setExitingSessionId((currentSessionId) => currentSessionId === sessionId ? undefined : currentSessionId)
    titleRef.current?.focus()
  }, [completeSessionRevocation])

  return (
    <section aria-labelledby="connected-devices-title" className="border-t border-capta-border-default px-6 pt-6 pb-8 sm:px-8" data-settings-connected-devices-group>
      <div>
        <h3 className="text-ui-semibold text-capta-text-primary outline-none" id="connected-devices-title" ref={titleRef} tabIndex={-1}>{t("title")}</h3>
        <p className="mt-1 max-w-xl text-ui text-capta-text-secondary">{t("description")}</p>
      </div>

      {isLoading ? <ConnectedDevicesSkeleton label={t("loading")} /> : null}

      {!isLoading && loadError ? (
        <div className="mt-5 flex items-start gap-3 rounded-[var(--radius-token-md)] border border-[var(--color-feedback-error)]/30 bg-[var(--color-feedback-error)]/5 p-4" role="alert">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--color-feedback-error)]" />
          <div className="min-w-0 flex-1">
            <p className="text-ui font-semibold text-capta-text-primary">{t("loadError")}</p>
            <p className="mt-1 text-caption text-capta-text-secondary">{loadError}</p>
          </div>
          <Button onClick={() => void retry()} size="sm" type="button" variant="secondary">{tActions("retry")}</Button>
        </div>
      ) : null}

      {!isLoading && !loadError && activeSessions.length === 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-[var(--radius-token-md)] border border-capta-border-default bg-capta-surface-subtle p-4">
          <MonitorSmartphone aria-hidden="true" className="size-4 shrink-0 text-capta-text-secondary" />
          <p className="text-ui text-capta-text-secondary">{t("empty")}</p>
        </div>
      ) : null}

      {!isLoading && !loadError && activeSessions.length > 0 ? (
        <>
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-caption text-capta-text-secondary">{t("sessionsFound", { shown: visibleSessions.length, total: orderedSessions.length })}</p>
            {hasHiddenSessions ? (
              <Button aria-controls="connected-devices-list" aria-expanded={isExpanded} className="!h-7 border border-capta-border-default bg-capta-surface-card px-2 text-caption font-semibold hover:bg-capta-surface-subtle" onClick={() => setIsExpanded((expanded) => !expanded)} size="sm" type="button" variant="ghost">
                {isExpanded ? t("showLess") : t("viewAll")}
              </Button>
            ) : null}
          </div>
          <ul aria-label={t("title")} className="mt-3 divide-y divide-capta-border-default" id="connected-devices-list">
            {visibleSessions.map((session) => <ConnectedDeviceRow isDisabled={isRevoking || Boolean(exitingSessionId)} isExiting={exitingSessionId === session.id} isRevoking={isRevoking && revokingSessionId === session.id} key={session.id} onExitComplete={handleExitComplete} onRevoke={requestSessionRevocation} session={session} />)}
          </ul>
        </>
      ) : null}

      <RevokeSessionDialog
        isRevoking={isRevoking}
        onCancel={() => setSessionToRevoke(null)}
        onConfirm={confirmSessionRevocation}
        session={sessionToRevoke}
      />
    </section>
  )
}

function ConnectedDevicesSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="mt-5 space-y-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="flex items-center gap-3" key={index}>
          <span className="size-8 animate-pulse rounded-[var(--radius-token-md)] bg-capta-surface-subtle" />
          <span className="h-4 w-40 animate-pulse rounded-full bg-capta-surface-subtle" />
        </div>
      ))}
    </div>
  )
}

export { ConnectedDevicesPanel }
