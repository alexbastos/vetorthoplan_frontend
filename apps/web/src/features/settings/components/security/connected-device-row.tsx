import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Laptop, Smartphone, Trash2 } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import type { ActiveSession } from "../../types/settings"

gsap.registerPlugin(useGSAP)

type ConnectedDeviceRowProps = {
  isDisabled: boolean
  isExiting: boolean
  isRevoking: boolean
  onExitComplete: (sessionId: string) => void
  onRevoke: (session: ActiveSession) => void
  session: ActiveSession
}

function ConnectedDeviceRow({ isDisabled, isExiting, isRevoking, onExitComplete, onRevoke, session }: ConnectedDeviceRowProps) {
  const format = useFormatter()
  const t = useTranslations("settings.devices")
  const DeviceIcon = isMobileDevice(session.deviceName) ? Smartphone : Laptop
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
        const tween = gsap.to(row, {
          autoAlpha: 0,
          duration: 0.22,
          ease: "power2.inOut",
          height: 0,
          onComplete: () => onExitComplete(session.id),
          paddingBottom: 0,
          paddingTop: 0,
          y: -6,
        })

        return () => tween.kill()
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
    <li className="flex items-center gap-3 overflow-hidden py-4 first:pt-0 last:pb-0" ref={rowRef}>
      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-token-md)] border border-capta-border-default bg-capta-surface-subtle text-capta-text-secondary">
        <DeviceIcon className="size-4" strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-ui font-semibold text-capta-text-primary">{session.deviceName || t("unknownDevice")}</p>
        <p className="mt-0.5 truncate text-caption text-capta-text-secondary">{sessionDetails}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className={session.isCurrent ? "text-caption font-semibold text-capta-feedback-success" : "text-caption text-capta-text-secondary"}>{sessionStatus}</span>
        {!session.isCurrent ? (
          <Button aria-haspopup="dialog" aria-label={t("revokeDevice", { device: session.deviceName || t("unknownDevice") })} className="size-8 p-0 text-capta-text-muted hover:!bg-[var(--color-feedback-error)]/10 hover:text-[var(--color-feedback-error)]" disabled={isDisabled || isExiting} loading={isRevoking} onClick={() => onRevoke(session)} size="sm" type="button" variant="ghost">
            {!isRevoking ? <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.5} /> : null}
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function isMobileDevice(deviceName: string | null) {
  return Boolean(deviceName && /android|iphone|ipad|mobile/i.test(deviceName))
}

export { ConnectedDeviceRow }
