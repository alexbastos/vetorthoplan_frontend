import {
  Building2,
  Cpu,
  GraduationCap,
  HeartPulse,
  Leaf,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

import type { NoticeCategory, NoticePreview } from "../types"

const categoryIcons = {
  education: GraduationCap,
  energy: Zap,
  health: HeartPulse,
  infrastructure: Building2,
  sustainability: Leaf,
  technology: Cpu,
} satisfies Record<NoticeCategory, LucideIcon>

type NoticeMarqueeCardProps = {
  opportunity: NoticePreview
}

function NoticeMarqueeCard({ opportunity }: NoticeMarqueeCardProps) {
  const CategoryIcon = categoryIcons[opportunity.category]
  const fitValue = Number.parseInt(opportunity.fit, 10)
  const fitTone = fitValue >= 85
    ? "border-capta-feedback-success/20 bg-capta-feedback-success/10 text-capta-feedback-success"
    : fitValue >= 65
      ? "border-capta-feedback-warning/25 bg-capta-feedback-warning/10 text-capta-feedback-warning"
      : "border-capta-border-default bg-capta-surface-subtle text-capta-text-secondary"

  return (
    <article className="flex w-full flex-col items-start gap-4 rounded-[var(--radius-token-lg)] border border-capta-border-default bg-capta-surface-card p-4">
      <div className="flex w-full items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2 text-caption font-medium text-capta-text-secondary">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-capta-border-default bg-capta-surface-card text-capta-text-secondary">
            <CategoryIcon className="size-3.5" strokeWidth={1.8} />
          </span>
          <span className="truncate">{opportunity.organization}</span>
        </span>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold", fitTone)}>
          {opportunity.fit}
        </span>
      </div>

      <p className="line-clamp-2 text-caption text-capta-text-secondary">
        <span className="font-semibold text-capta-text-primary">{opportunity.title}</span>
        <span aria-hidden="true"> · </span>
        <span className="font-semibold text-capta-brand-secondary">{opportunity.amount}</span>
      </p>
    </article>
  )
}

export { NoticeMarqueeCard }
export type { NoticeMarqueeCardProps }
