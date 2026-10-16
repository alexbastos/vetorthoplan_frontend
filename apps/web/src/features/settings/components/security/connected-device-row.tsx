import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Trash2 } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import { ConnectedDeviceIcon } from "./connected-device-icon"
import type { ActiveSession } from "../../types/settings"

gsap.registerPlugin(useGSAP)

type ConnectedDeviceRowProps = {
  isDisabled: boolean
  isExiting: boolean
  isRevoking: boolean
  onExitComplete: (sessionId: string) => void
  onRevoke: (session: ActiveSession) => Promise<void>
  session: ActiveSession
}

function ConnectedDeviceRow({ isDisabled, isExiting, isRevoking, onExitComplete, onRevoke, session }: ConnectedDeviceRowProps) {
  const format = useFormatter()
  const t = useTranslations("settings.devices")
  const location = [session.location?.city, session.location?.region, session.location?.countryCode]
    .filter(Boolean)
    .join(", ")
  const sessionDetails = [location, session.ipAddress ? t("ipAddress", { ipAddress: session.ipAddress }) : undefined]
    .filter(Boolean)
    .join(" · ")
  const sessionStatus = session.isCurrent
    ? t("currentSession")
    : t("connectedRelative", { time: format.relativeTime(new Date(session.lastSeenAt), new Date()) })
  const rowRef = useRef<HTMLLIElement>(null)

  useGSAP(
    () => {
      const row = rowRef.current

      if (!row || !isExiting) return undefined

      const media = gsap.matchMedia()
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ onComplete: () => onExitComplete(session.id) })
        timeline
          .to(row, {
            autoAlpha: 0,
            duration: 0.18,
            ease: "power2.in",
            x: 18,
          })
          .to(row, {
            duration: 0.2,
            ease: "power2.inOut",
            height: 0,
            paddingBottom: 0,
            paddingTop: 0,
          })

        return () => timeline.kill()
      })
      media.add("(prefers-reduced-motion: reduce)", () => {
        onExitComplete(session.id)
        return undefined
      })

      return () => media.revert()
    },
    { dependencies: [isExiting, onExitComplete, session.id], scope: rowRef },
  )

  return (
    <li className="flex items-start gap-3 overflow-hidden py-4 first:pt-0 last:pb-0 sm:items-center sm:gap-4" ref={rowRef}>
      <ConnectedDeviceIcon deviceName={session.deviceName} userAgent={session.userAgent} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-ui font-semibold text-foreground">{session.deviceName || t("unknownDevice")}</p>
          {session.isCurrent ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-feedback-success)_10%,transparent)] px-2 py-0.5 text-[0.6875rem] leading-4 font-medium text-success">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {t("currentSession")}
            </span>
          ) : null}
        </div>
        {sessionDetails ? <p className="mt-1 truncate text-caption text-content-secondary">{sessionDetails}</p> : null}
      </div>

      {!session.isCurrent ? (
        <div className="flex shrink-0 flex-col items-end gap-2 sm:translate-y-0.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-right text-caption text-description">{sessionStatus}</span>
          <Button aria-label={t("revokeDevice", { device: session.deviceName || t("unknownDevice") })} className="size-8 shrink-0 p-0 text-muted-foreground hover:!bg-[var(--color-feedback-error)]/10 hover:text-[var(--color-feedback-error)]" disabled={isDisabled || isExiting} loading={isRevoking} onClick={() => void onRevoke(session)} size="sm" title={t("revokeDevice", { device: session.deviceName || t("unknownDevice") })} type="button" variant="ghost">
            {!isRevoking ? <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.5} /> : null}
          </Button>
        </div>
      ) : null}
    </li>
  )
}

export { ConnectedDeviceRow }
