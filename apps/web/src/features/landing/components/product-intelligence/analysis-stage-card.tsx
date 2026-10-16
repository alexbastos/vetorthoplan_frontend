import { Building2, Check, Construction, FileSearch, HeartPulse, LoaderCircle, Sparkles } from "lucide-react"

import { AnalysisNoticeScanner } from "./analysis-notice-scanner"
import type { OpportunityAnalysisStage, OpportunityAnalysisStageId, OpportunityAnalysisStatusLabels } from "./types"

const stageIcons = {
  notice: FileSearch,
  profile: Building2,
  recommendation: Sparkles,
} satisfies Record<OpportunityAnalysisStageId, typeof Building2>

type AnalysisStageCardProps = {
  noticeOptionIndex: number
  stage: OpportunityAnalysisStage
  statusLabels: OpportunityAnalysisStatusLabels
}

function AnalysisStageCard({ noticeOptionIndex, stage, statusLabels }: AnalysisStageCardProps) {
  const Icon = stageIcons[stage.id]
  const noticeOption = stage.noticeOptions?.[noticeOptionIndex]
  const recommendationOption = stage.recommendationDetails?.options[noticeOptionIndex]

  return (
    <div data-analysis-stage>
      <div className="relative mb-2 h-6 text-caption font-semibold">
        <span aria-hidden="true" data-analysis-status="pending" className="absolute inset-y-0 left-0 inline-flex items-center rounded-[var(--radius-token-md)] border border-capta-border-default bg-capta-surface-card px-2 text-capta-text-muted">
          {statusLabels.pending}
        </span>
        <span aria-hidden="true" data-analysis-status="running" className="absolute inset-y-0 left-0 inline-flex items-center gap-1 rounded-[var(--radius-token-md)] border border-capta-brand-accent/40 bg-capta-surface-accent px-2 text-capta-brand-accent opacity-0">
          <LoaderCircle data-analysis-status-spinner className="size-3" strokeWidth={2.2} />
          {statusLabels.running}
        </span>
        <span aria-hidden="true" data-analysis-status="success" className="absolute inset-y-0 left-0 inline-flex items-center gap-1 rounded-[var(--radius-token-md)] border border-[var(--color-sage-200)] bg-[var(--color-sage-50)] px-2 text-capta-feedback-success opacity-0">
          <Check aria-hidden="true" className="size-3" strokeWidth={2.4} />
          {statusLabels.success}
        </span>
      </div>

      <div className="relative">
        <span
          data-analysis-orbit
          className="pointer-events-none absolute -inset-px z-10 rounded-[var(--radius-token-lg)] bg-[conic-gradient(from_var(--analysis-angle),transparent_0deg,transparent_245deg,var(--color-brand-accent)_315deg,transparent_360deg)] p-[1.5px] opacity-0 [--analysis-angle:0deg] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [-webkit-mask-composite:xor]"
        />
        <article data-analysis-card className="relative z-20 overflow-hidden rounded-[var(--radius-token-lg)] border border-capta-border-default bg-capta-surface-card shadow-[var(--shadow-card-layered)]">
          <div className="flex items-center gap-2.5 border-b border-capta-border-default px-4 py-3">
            <span className="flex size-7 items-center justify-center rounded-md bg-capta-surface-subtle text-capta-brand-primary">
              <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </span>
            <h3 className="text-ui font-semibold text-capta-text-primary">{stage.title}</h3>
          </div>
          {stage.id === "profile" && stage.details ? (
            <div className="px-4 py-3">
              <ul aria-label={stage.details.prioritiesLabel} className="grid grid-cols-2 divide-x divide-capta-border-default">
                {stage.details.priorities.map((priority) => {
                  const PriorityIcon = priority.icon === "health" ? HeartPulse : Construction

                  return (
                    <li key={priority.label} className="min-w-0 px-3 first:pl-1.5 last:pr-0">
                      <div className="flex items-center gap-1.5 text-capta-brand-primary">
                        <PriorityIcon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
                        <span className="truncate text-caption font-semibold text-capta-text-primary">{priority.label}</span>
                      </div>
                      <span className="mt-1 block text-caption leading-tight text-capta-text-secondary">{priority.description}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : stage.id === "notice" && noticeOption ? (
            <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-2.5 px-4 py-2.5">
              <AnalysisNoticeScanner />
              <div className="min-w-0">
                <p className="truncate text-caption font-semibold text-capta-text-primary" title={noticeOption.title}>{noticeOption.title}</p>
                <dl className="mt-1.5 grid grid-cols-2 gap-3 text-caption">
                  <div className="grid gap-0.5">
                    <dt className="text-capta-text-muted">{noticeOption.deadlineLabel}</dt>
                    <dd className="font-medium text-capta-text-secondary">{noticeOption.deadlineValue}</dd>
                  </div>
                  <div className="grid gap-0.5">
                    <dt className="text-capta-text-muted">{noticeOption.counterpartyLabel}</dt>
                    <dd className="font-medium text-capta-text-secondary">{noticeOption.counterpartyValue}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : stage.id === "recommendation" && stage.recommendationDetails && recommendationOption ? (
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 px-4 py-3">
              <div className="flex self-stretch flex-col items-center justify-center border-r border-capta-border-default pr-2 text-center">
                <p className="text-xl leading-none font-semibold tracking-tight text-capta-brand-primary">{recommendationOption.adherenceValue}</p>
                <p className="mt-1 text-caption text-capta-text-muted">{stage.recommendationDetails.adherenceLabel}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-caption font-semibold text-capta-text-primary" title={recommendationOption.title}>{recommendationOption.title}</p>
                <p className="mt-1 text-caption font-medium text-capta-feedback-success">{stage.recommendationDetails.recommendationLabel}</p>
                <p className="mt-1 text-caption leading-tight text-capta-text-secondary">{recommendationOption.reason}</p>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3.5">
              <p className="text-meta text-capta-text-secondary">{stage.summary}</p>
            </div>
          )}
        </article>
        <span
          aria-hidden="true"
          data-analysis-success-flash
          className="pointer-events-none absolute -inset-px z-30 rounded-[var(--radius-token-lg)] border border-capta-feedback-success opacity-0 shadow-[var(--shadow-analysis-success)]"
        />
      </div>
    </div>
  )
}

export { AnalysisStageCard }
export type { AnalysisStageCardProps }
