import { CalendarDays } from "lucide-react"

import type { PipelineItem } from "../types"
import { PipelineCategoryIcon } from "./pipeline-category-icon"

type PipelineOpportunityCardProps = {
  opportunity: PipelineItem
}

function PipelineOpportunityCard({ opportunity }: PipelineOpportunityCardProps) {
  return (
    <article className="rounded-md border border-capta-border-default bg-capta-surface-card px-3 py-2.5 opacity-55">
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded-md bg-capta-surface-subtle text-capta-text-muted"
        >
          <PipelineCategoryIcon category={opportunity.category} className="size-3" />
        </span>
        <h4 className="line-clamp-2 min-w-0 text-[0.625rem] leading-4 font-semibold text-capta-text-secondary sm:text-caption">
          {opportunity.title}
        </h4>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[0.5625rem] text-capta-text-muted">
        <CalendarDays aria-hidden="true" className="size-2.5" strokeWidth={1.8} />
        {opportunity.deadline}
      </p>
    </article>
  )
}

export { PipelineOpportunityCard }
export type { PipelineOpportunityCardProps }
