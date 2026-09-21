import { CalendarDays, Check } from "lucide-react"

import type { PipelineFeaturedOpportunity } from "../types"
import { PipelineCategoryIcon } from "./pipeline-category-icon"

type PipelineFeaturedCardProps = {
  opportunity: PipelineFeaturedOpportunity
  readyLabel: string
}

function PipelineFeaturedCard({ opportunity, readyLabel }: PipelineFeaturedCardProps) {
  return (
    <article
      className="h-[7.25rem] overflow-hidden rounded-[var(--radius-token-md)] border border-capta-border-default bg-capta-surface-card px-3 py-3 shadow-[0_12px_24px_-18px_rgba(11,31,58,0.55)]"
    >
      <div className="flex items-center gap-1.5 text-[0.5625rem] text-capta-text-muted sm:text-[0.625rem]">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-capta-surface-selected text-capta-brand-primary">
          <PipelineCategoryIcon category={opportunity.category} className="size-3" />
        </span>
        <span className="truncate">{opportunity.organization}</span>
      </div>

      <h4 className="mt-2 h-8 whitespace-pre-line line-clamp-2 text-[0.625rem] leading-4 font-semibold text-capta-text-primary sm:text-caption">
        {opportunity.title}
      </h4>

      <div className="relative mt-2 h-6 border-t border-capta-border-default pt-2">
        <div
          data-pipeline-card-status="0"
          className="absolute inset-x-0 top-2 flex items-center gap-1 text-[0.5625rem] text-capta-text-secondary"
        >
          <CalendarDays aria-hidden="true" className="size-2.5 shrink-0" strokeWidth={1.8} />
          <span className="truncate">{opportunity.deadline}</span>
        </div>

        <div
          data-pipeline-card-status="1"
          className="invisible absolute inset-x-0 top-2 flex items-center justify-between gap-2 text-[0.5625rem] opacity-0"
        >
          <span className="flex min-w-0 items-center gap-1.5 text-capta-text-secondary">
            <span
              data-pipeline-loading-spinner
              className="size-3 shrink-0 rounded-full border border-capta-border-default border-t-capta-brand-secondary will-change-transform"
            />
            <span className="truncate">{opportunity.progressLabel}</span>
          </span>
          <span className="shrink-0 font-semibold text-capta-text-primary">{opportunity.progressValue}</span>
        </div>

        <div
          data-pipeline-card-status="2"
          className="invisible absolute inset-x-0 top-2 flex items-center gap-1 text-[0.5625rem] font-semibold text-capta-feedback-success opacity-0"
        >
          <span className="flex size-3.5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-feedback-success)_12%,white)]">
            <Check aria-hidden="true" className="size-2.5" strokeWidth={2.2} />
          </span>
          <span className="truncate">{readyLabel}</span>
        </div>
      </div>
    </article>
  )
}

export { PipelineFeaturedCard }
export type { PipelineFeaturedCardProps }
