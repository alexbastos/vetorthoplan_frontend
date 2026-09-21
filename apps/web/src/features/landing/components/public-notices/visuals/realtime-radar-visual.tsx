"use client"

import { useRef } from "react"

import { useRealtimeRadarMarquee } from "../../../hooks/animations/use-realtime-radar-marquee"
import type { NoticePreview, RealtimeRadarVisualContent } from "../types"
import { NoticeMarqueeCard } from "./notice-marquee-card"

type RealtimeRadarVisualProps = {
  content: RealtimeRadarVisualContent
  isActive: boolean
}

function rotateOpportunities(opportunities: NoticePreview[]) {
  return opportunities.length > 1
    ? [...opportunities.slice(1), opportunities[0]]
    : opportunities
}

function RealtimeRadarVisual({ content, isActive }: RealtimeRadarVisualProps) {
  const scope = useRef<HTMLDivElement>(null)
  const columns = [content.opportunities, rotateOpportunities(content.opportunities)]

  useRealtimeRadarMarquee(scope, isActive)

  return (
    <div
      ref={scope}
      role="img"
      aria-label={content.accessibleLabel}
      className="flex h-full items-center justify-center px-5 sm:px-12"
    >
      <div aria-hidden="true" className="relative h-full w-full max-w-lg select-none overflow-hidden">
        <div className="grid h-full grid-cols-1 gap-4 overflow-hidden py-3 [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_84%,transparent)] sm:grid-cols-2">
          {columns.map((opportunities, columnIndex) => (
            <div
              key={columnIndex}
              className={columnIndex === 1
                ? "relative hidden h-full overflow-hidden sm:block"
                : "relative h-full overflow-hidden"}
            >
              <div
                data-radar-marquee-track
                data-radar-marquee-direction={columnIndex === 1 ? "down" : "up"}
                className="flex flex-col will-change-transform"
              >
                {[0, 1].map((setIndex) => (
                  <div key={setIndex} className="flex flex-col gap-5 pb-5">
                    {opportunities.map((opportunity, opportunityIndex) => (
                      <NoticeMarqueeCard
                        key={`${setIndex}-${opportunityIndex}-${opportunity.title}`}
                        opportunity={opportunity}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 -translate-y-1/2">
          <span
            data-radar-scanner-pulse
            className="block h-px bg-[linear-gradient(90deg,transparent,var(--color-neutral-300)_24%,var(--color-neutral-300)_76%,transparent)] shadow-[0_0_14px_color-mix(in_srgb,var(--color-neutral-300)_35%,transparent)]"
          />
        </div>
      </div>
    </div>
  )
}

export { RealtimeRadarVisual }
export type { RealtimeRadarVisualProps }
