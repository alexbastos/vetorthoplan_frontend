"use client"

import { AlertCircle, MonitorSmartphone } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ConnectedDeviceRow } from "./connected-device-row"
import { useConnectedDevices } from "../../hooks/use-connected-devices"
import type { ActiveSession } from "../../types/settings"

type ConnectedDevicesPanelProps = {
  isActive: boolean
}

const INITIAL_VISIBLE_SESSIONS = 4
const PREVIEW_SESSION_ID = "settings-device-preview"
const PREVIEW_SESSION: ActiveSession = {
  createdAt: "2026-09-27T13:30:00.000Z",
  deviceName: "Microsoft Edge 153 - macOS",
  expiresAt: "2026-10-04T13:30:00.000Z",
  id: PREVIEW_SESSION_ID,
  ipAddress: "203.0.113.42",
  isCurrent: false,
  lastSeenAt: "2026-09-28T12:15:00.000Z",
  location: {
    city: "Curitiba",
    countryCode: "BR",
    countryName: "Brasil",
    region: "PR",
  },
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0",
}

function ConnectedDevicesPanel({ isActive }: ConnectedDevicesPanelProps) {
  const t = useTranslations("settings.devices")
  const tActions = useTranslations("common.actions")
  const { activeSessions, completeSessionRevocation, isLoading, isRevoking, loadError, revokeSession, revokingSessionId, retry } = useConnectedDevices({ enabled: isActive })
  const revocationLockRef = useRef(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPreviewSessionVisible, setIsPreviewSessionVisible] = useState(process.env.NODE_ENV === "development")
  const [exitingSessionId, setExitingSessionId] = useState<string>()
  const displayedSessions = isPreviewSessionVisible ? [...activeSessions, PREVIEW_SESSION] : activeSessions
  const orderedSessions = [...displayedSessions].sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent))
  const visibleSessions = isExpanded ? orderedSessions : orderedSessions.slice(0, INITIAL_VISIBLE_SESSIONS)
  const hasHiddenSessions = orderedSessions.length > INITIAL_VISIBLE_SESSIONS

  async function revokeDeviceSession(session: ActiveSession) {
    if (session.isCurrent || revocationLockRef.current || exitingSessionId) {
      return
    }

    revocationLockRef.current = true

    try {
      if (session.id === PREVIEW_SESSION_ID) {
        setExitingSessionId(PREVIEW_SESSION_ID)
        toast.success(t("revoked"))
        return
      }

      await revokeSession(session.id)
      setExitingSessionId(session.id)
      toast.success(t("revoked"))
    } catch (error) {
      toast.error(t("revokeError"), { description: error instanceof Error ? error.message : undefined })
    } finally {
      revocationLockRef.current = false
    }
  }

  const handleExitComplete = useCallback((sessionId: string) => {
    if (sessionId === PREVIEW_SESSION_ID) {
      setIsPreviewSessionVisible(false)
    } else {
      completeSessionRevocation(sessionId)
    }

    setExitingSessionId((currentSessionId) => currentSessionId === sessionId ? undefined : currentSessionId)
    titleRef.current?.focus()
  }, [completeSessionRevocation])

  return (
    <section aria-labelledby="connected-devices-title" className="px-6 pt-6 pb-8 sm:px-8 sm:pt-7" data-settings-connected-devices-group>
      <div>
        <h2 className="font-heading text-ui-semibold text-foreground outline-none" id="connected-devices-title" ref={titleRef} tabIndex={-1}>{t("title")}</h2>
        <p className="mt-1 max-w-xl text-ui text-description">{t("description")}</p>
      </div>

      {isLoading ? <ConnectedDevicesSkeleton label={t("loading")} /> : null}

      {!isLoading && loadError ? (
        <div className="mt-5 flex items-start gap-3 rounded-[var(--radius-token-md)] border border-[var(--color-feedback-error)]/30 bg-[var(--color-feedback-error)]/5 p-4" role="alert">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--color-feedback-error)]" />
          <div className="min-w-0 flex-1">
            <p className="text-ui font-semibold text-foreground">{t("loadError")}</p>
            <p className="mt-1 text-caption text-content-secondary">{loadError}</p>
          </div>
          <Button onClick={() => void retry()} size="sm" type="button" variant="secondary">{tActions("retry")}</Button>
        </div>
      ) : null}

      {!isLoading && !loadError && orderedSessions.length === 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-[var(--radius-token-md)] border border-border bg-muted p-4">
          <MonitorSmartphone aria-hidden="true" className="size-4 shrink-0 text-content-secondary" />
          <p className="text-ui text-content-secondary">{t("empty")}</p>
        </div>
      ) : null}

      {!isLoading && !loadError && orderedSessions.length > 0 ? (
        <>
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-caption text-content-secondary">{t("sessionsFound", { shown: visibleSessions.length, total: orderedSessions.length })}</p>
            {hasHiddenSessions ? (
              <Button aria-controls="connected-devices-list" aria-expanded={isExpanded} className="!h-7 border border-border bg-card px-2 text-caption font-semibold hover:bg-muted" onClick={() => setIsExpanded((expanded) => !expanded)} size="sm" type="button" variant="ghost">
                {isExpanded ? t("showLess") : t("viewAll")}
              </Button>
            ) : null}
          </div>
          <ul aria-label={t("title")} className="mt-3 divide-y divide-border border-t border-border pt-4" id="connected-devices-list">
            {visibleSessions.map((session) => <ConnectedDeviceRow isDisabled={isRevoking || Boolean(exitingSessionId)} isExiting={exitingSessionId === session.id} isRevoking={isRevoking && revokingSessionId === session.id} key={session.id} onExitComplete={handleExitComplete} onRevoke={revokeDeviceSession} session={session} />)}
          </ul>
        </>
      ) : null}
    </section>
  )
}

function ConnectedDevicesSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="mt-6 divide-y divide-border border-t border-border pt-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="flex items-center gap-4 py-4 first:pt-0" key={index}>
          <span className="size-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <span className="block h-4 w-40 animate-pulse rounded-full bg-muted" />
            <span className="block h-3 w-56 max-w-full animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export { ConnectedDevicesPanel }
