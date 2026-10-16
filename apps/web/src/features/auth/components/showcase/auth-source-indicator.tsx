"use client"

import { Database, Landmark, type LucideIcon } from "lucide-react"
import { useRef } from "react"
import { useTranslations } from "next-intl"

import { useAuthPageEntered } from "../shell/auth-page-motion"
import { useAuthSourceCycle } from "../../hooks/animations/use-auth-source-cycle"

type Source = {
  icon: LucideIcon
  labelKey: "publicSources" | "transferegov"
}

const sources: readonly Source[] = [
  { icon: Landmark, labelKey: "transferegov" },
  { icon: Database, labelKey: "publicSources" },
]

function AuthSourceIndicator() {
  const t = useTranslations("auth.showcase")
  const hasEntered = useAuthPageEntered()
  const indicatorRef = useRef<HTMLDivElement>(null)
  const tileRef = useRef<HTMLDivElement>(null)
  const iconRefs = useRef<HTMLDivElement[]>([])
  const detailsRefs = useRef<HTMLDivElement[]>([])
  const progressRefs = useRef<HTMLSpanElement[]>([])

  useAuthSourceCycle(
    { details: detailsRefs, icons: iconRefs, progress: progressRefs, scope: indicatorRef, tile: tileRef },
    hasEntered,
  )

  return (
    <div ref={indicatorRef} aria-hidden="true" className="absolute top-40 left-10 z-10 h-12 w-56" data-auth-source>
      <div ref={tileRef} className="absolute inset-y-0 left-0 grid size-12 place-items-center rounded-[var(--radius-token-md)] border border-capta-border-default bg-capta-surface-card shadow-[var(--card-base-shadow)]">
        {sources.map(({ icon: Icon, labelKey }, index) => (
          <div
            key={labelKey}
            ref={(element) => {
              if (element) {
                iconRefs.current[index] = element
              }
            }}
            className={index === 0 ? "absolute inset-0 grid place-items-center" : "absolute inset-0 grid place-items-center opacity-0"}
          >
            <Icon className="size-5 text-capta-brand-primary" strokeWidth={1.5} />
          </div>
        ))}
      </div>

      {sources.map(({ labelKey }, index) => (
        <div
          key={labelKey}
          ref={(element) => {
            if (element) {
              detailsRefs.current[index] = element
            }
          }}
          className={index === 0 ? "absolute inset-y-0 left-16 flex items-center gap-3" : "absolute inset-y-0 left-16 flex items-center gap-3 opacity-0"}
        >
          <div className="w-10 overflow-hidden bg-capta-border-default">
            <span
              ref={(element) => {
                if (element) {
                  progressRefs.current[index] = element
                }
              }}
              className="block h-0.5 origin-left bg-capta-brand-primary"
            />
          </div>
          <span className="text-overline text-capta-text-secondary">{labelKey === "transferegov" ? "Transferegov" : t(labelKey)}</span>
        </div>
      ))}
    </div>
  )
}

export { AuthSourceIndicator }
