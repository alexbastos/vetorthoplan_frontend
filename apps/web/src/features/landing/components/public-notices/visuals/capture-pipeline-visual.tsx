"use client"

import { Clock3 } from "lucide-react"
import { useRef } from "react"

import { useCapturePipelineAnimation } from "../../../hooks/animations/use-capture-pipeline-animation"
import type { CapturePipelineVisualContent } from "../types"
import { PipelineFeaturedCard } from "./pipeline-featured-card"
import { PipelineOpportunityCard } from "./pipeline-opportunity-card"

type CapturePipelineVisualProps = {
  content: CapturePipelineVisualContent
  isActive: boolean
}

function CapturePipelineVisual({ content, isActive }: CapturePipelineVisualProps) {
  const scope = useRef<HTMLDivElement>(null)

  useCapturePipelineAnimation(scope, isActive)

  return (
    <div
      ref={scope}
      role="img"
      aria-label={content.accessibleLabel}
      className="flex h-full items-center justify-center overflow-hidden px-4 py-6 sm:px-10 sm:py-8"
    >
      <div
        aria-hidden="true"
        className="w-full max-w-[44rem] overflow-hidden rounded-[var(--radius-token-lg)] border border-capta-border-default bg-capta-surface-card shadow-[var(--shadow-card-layered)]"
      >
        <div className="relative flex h-8 items-center border-b border-capta-border-default px-3">
          <div className="flex shrink-0 items-center gap-1">
            <span className="size-1.5 rounded-full bg-[var(--color-neutral-400)]" />
            <span className="size-1.5 rounded-full bg-[var(--color-neutral-400)]" />
            <span className="size-1.5 rounded-full bg-[var(--color-neutral-400)]" />
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-capta-surface-subtle px-8 py-1 text-[0.5rem] text-capta-text-muted">
            app.captagov.com.br/pipeline
          </span>
        </div>

        <header className="flex h-12 items-center justify-between gap-4 border-b border-capta-border-default px-4">
          <h3 className="text-caption font-semibold text-capta-text-primary sm:text-ui">
            {content.heading}
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.625rem] text-capta-text-secondary sm:text-caption">
            <Clock3 aria-hidden="true" className="size-3" strokeWidth={1.8} />
            {content.periodLabel}
          </span>
        </header>

        <div className="relative h-[15rem] overflow-hidden">
          {[0, 1].map((segmentIndex) => (
            <div
              data-pipeline-progress-track
              className="pointer-events-none absolute top-6 left-0 z-[5] h-px w-0 bg-capta-border-default"
              key={segmentIndex}
            >
              <span
                data-pipeline-progress-fill
                className="block size-full origin-left scale-x-0 bg-capta-feedback-success will-change-transform"
              />
            </div>
          ))}

          <div className="grid h-full grid-cols-3 divide-x divide-capta-border-default">
            {content.columns.map((column) => (
              <section
                data-pipeline-stage-column
                className="relative min-w-0 bg-capta-surface-workspace/35"
                key={column.title}
              >
                <header className="relative z-10 flex h-12 items-center justify-center gap-1.5 px-2 text-center">
                  <div
                    data-pipeline-stage-label
                    className="flex min-w-0 max-w-full items-center justify-center gap-1.5"
                  >
                    <span
                      data-pipeline-stage-marker
                      className="size-2 shrink-0 rounded-full bg-capta-border-default ring-4 ring-capta-surface-card will-change-transform"
                    />
                    <h4 className="truncate text-[0.5625rem] font-semibold text-capta-text-secondary sm:text-caption">
                      {column.title}
                    </h4>
                  </div>
                </header>

                <div className="px-2 pt-[7.75rem] sm:px-3">
                  {column.items.map((item) => (
                    <PipelineOpportunityCard key={item.title} opportunity={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div
            data-pipeline-featured-card
            className="pointer-events-none absolute top-12 left-0 z-20 h-[7.25rem] w-1/3 will-change-transform"
          >
            {content.featuredOpportunities.map((opportunity, index) => (
              <div
                data-pipeline-featured-card-item
                className={index === 0
                  ? "absolute inset-x-2 top-0 sm:inset-x-3"
                  : "invisible absolute inset-x-2 top-0 opacity-0 sm:inset-x-3"}
                key={`${opportunity.organization}-${opportunity.title}`}
              >
                <PipelineFeaturedCard
                  opportunity={opportunity}
                  readyLabel={content.columns[2]?.title ?? ""}
                />
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-capta-surface-card to-transparent" />
        </div>
      </div>
    </div>
  )
}

export { CapturePipelineVisual }
export type { CapturePipelineVisualProps }
