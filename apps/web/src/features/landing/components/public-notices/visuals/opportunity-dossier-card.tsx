import {
  Banknote,
  CalendarDays,
  ListChecks,
  Sparkles,
  X,
} from "lucide-react"

import type { OpportunityDetailsVisualContent, OpportunityDossier } from "../types"
import { OpportunityDossierMetric } from "./opportunity-dossier-metric"
import { ShimmerDots } from "./shimmer-dots"

type OpportunityDossierCardProps = {
  content: OpportunityDetailsVisualContent
  dossier: OpportunityDossier
  isActive: boolean
}

function OpportunityDossierCard({ content, dossier, isActive }: OpportunityDossierCardProps) {
  return (
    <article
      id="opportunity-dossier-summary"
      aria-live="polite"
      data-opportunity-dossier
      className="flex w-[500px] flex-col overflow-hidden rounded-[var(--radius-token-lg)] border border-capta-border-default bg-capta-surface-card shadow-[0_20px_20px_0_rgba(15,23,42,0.09)]"
    >
      <header className="flex items-center gap-3 border-b border-capta-border-default px-5 py-4">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-capta-text-primary">
          {content.summaryLabel}
        </p>
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center text-capta-text-muted">
          <X className="size-4" strokeWidth={1.8} />
        </span>
      </header>

      <div className="flex min-h-0 flex-col px-6 pt-6">
        <section data-opportunity-dossier-section>
          <h3 className="max-w-[24rem] text-lg font-semibold tracking-[-0.01em] text-capta-text-primary">
            {dossier.title}
          </h3>
          <p className="mt-1.5 text-sm text-capta-text-muted">{dossier.organization}</p>
        </section>

        <section
          data-opportunity-dossier-section
          className="relative isolate mt-6 overflow-hidden rounded-[var(--radius-token-md)] border border-capta-border-default bg-capta-surface-card px-5 py-5"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)] [mask-repeat:no-repeat]"
          >
            <ShimmerDots isActive={isActive} />
          </div>

          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-capta-surface-card text-capta-brand-primary shadow-sm">
              <Sparkles className="size-4" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-capta-text-primary">{content.recommendationTitle}</h4>
              <p className="mt-1 text-sm leading-relaxed text-capta-text-secondary">{dossier.opinion}</p>
            </div>
          </div>
        </section>

        <dl
          data-opportunity-dossier-section
          className="mt-6 grid grid-cols-3 divide-x divide-capta-border-default pb-5"
        >
          <OpportunityDossierMetric icon={Banknote} label={content.amountLabel} value={dossier.amountValue} />
          <OpportunityDossierMetric icon={CalendarDays} label={content.deadlineLabel} value={dossier.deadlineValue} />
          <OpportunityDossierMetric
            icon={ListChecks}
            label={content.requirementsLabel}
            value={dossier.requirementsValue}
          />
        </dl>
      </div>
    </article>
  )
}

export { OpportunityDossierCard }
export type { OpportunityDossierCardProps }
