import { type ReactNode, useId } from "react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  action?: ReactNode
  className?: string
  description?: ReactNode
  descriptionClassName?: string
  illustration?: ReactNode
  title: ReactNode
  titleClassName?: string
}

function EmptyState({
  action,
  className,
  description,
  descriptionClassName,
  illustration,
  title,
  titleClassName,
}: EmptyStateProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className={cn("flex w-full max-w-md flex-col items-center text-center", className)}>
      {illustration ? <div className="mb-5" data-empty-state-part="illustration">{illustration}</div> : null}
      <h2 id={titleId} className={cn("text-ui-semibold text-foreground", titleClassName)} data-empty-state-part="title">
        {title}
      </h2>
      {description ? <p className={cn("mt-2 text-ui text-content-secondary", descriptionClassName)} data-empty-state-part="description">{description}</p> : null}
      {action ? <div className="mt-5" data-empty-state-part="action">{action}</div> : null}
    </section>
  )
}

function FadingDataTableIllustration({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-28 w-56 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_0%,#000_46%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_46%,transparent_100%)]",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 overflow-hidden rounded-[var(--radius-token-lg)] border border-border bg-card/80 shadow-[var(--shadow-subtle)]">
        <div className="grid h-8 grid-cols-[1.25fr_0.8fr_0.65fr] items-center gap-3 border-b border-border bg-muted px-3">
          <span className="h-1.5 rounded-full bg-muted-foreground/30" />
          <span className="h-1.5 rounded-full bg-muted-foreground/25" />
          <span className="h-1.5 rounded-full bg-muted-foreground/25" />
        </div>
        <FadingDataTableRow primaryWidth="w-16" secondaryWidth="w-10" valueWidth="w-8" />
        <FadingDataTableRow primaryWidth="w-20" secondaryWidth="w-12" valueWidth="w-10" />
        <FadingDataTableRow primaryWidth="w-14" secondaryWidth="w-9" valueWidth="w-7" />
        <FadingDataTableRow primaryWidth="w-18" secondaryWidth="w-11" valueWidth="w-9" />
      </div>
    </div>
  )
}

type FadingDataTableRowProps = {
  primaryWidth: string
  secondaryWidth: string
  valueWidth: string
}

function FadingDataTableRow({ primaryWidth, secondaryWidth, valueWidth }: FadingDataTableRowProps) {
  return (
    <div className="grid h-8 grid-cols-[1.25fr_0.8fr_0.65fr] items-center gap-3 border-b border-border/70 px-3 last:border-b-0">
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        <span className={cn("h-1.5 rounded-full bg-muted-foreground/30", primaryWidth)} />
      </span>
      <span className={cn("h-1.5 rounded-full bg-muted-foreground/25", secondaryWidth)} />
      <span className={cn("ml-auto h-4 rounded-full bg-hover", valueWidth)} />
    </div>
  )
}

export { EmptyState, FadingDataTableIllustration }
export type { EmptyStateProps }
