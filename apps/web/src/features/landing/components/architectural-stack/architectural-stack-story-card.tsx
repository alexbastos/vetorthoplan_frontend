import { forwardRef } from "react"

import { cn } from "@/lib/utils"

import type { ArchitecturalStackStoryContent } from "./architectural-stack-content"

type ArchitecturalStackStoryCardProps = {
  active: boolean
  content: ArchitecturalStackStoryContent
  index: number
}

function CornerBrackets() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 text-capta-text-primary transition-colors duration-[var(--motion-duration-slow)] group-data-[active=true]:text-capta-text-inverse motion-reduce:transition-none"
    >
      <span className="absolute -top-px -left-px size-3 border-t-2 border-l-2 border-current" />
      <span className="absolute -top-px -right-px size-3 border-t-2 border-r-2 border-current" />
      <span className="absolute -bottom-px -left-px size-3 border-b-2 border-l-2 border-current" />
      <span className="absolute -right-px -bottom-px size-3 border-r-2 border-b-2 border-current" />
    </span>
  )
}

const ArchitecturalStackStoryCard = forwardRef<HTMLElement, ArchitecturalStackStoryCardProps>(
  function ArchitecturalStackStoryCard({ active, content, index }, ref) {
    return (
      <article
        ref={ref}
        data-active={active}
        data-architectural-stack-story
        className={cn(
          "group relative border border-dashed border-capta-border-default bg-capta-surface-default px-6 py-8",
          "transition-[background-color,border-color] duration-[var(--motion-duration-slow)] ease-capta-standard",
          "data-[active=true]:border-capta-surface-inverse data-[active=true]:bg-capta-surface-inverse",
          "sm:px-8 sm:py-10 lg:px-9 lg:py-11 motion-reduce:transition-none",
        )}
      >
        <CornerBrackets />

        <div className="grid gap-5 sm:grid-cols-[2.5rem_minmax(0,1fr)] lg:grid-cols-1 lg:gap-8 xl:grid-cols-[2.5rem_minmax(0,1fr)] xl:gap-6">
          <span
            aria-hidden="true"
            className="font-mono text-meta text-capta-text-muted transition-colors duration-[var(--motion-duration-slow)] group-data-[active=true]:text-capta-text-inverse/45 motion-reduce:transition-none"
          >
            {String(index + 1).padStart(2, "0")}
          </span>

          <div>
            <p className="text-overline text-capta-text-muted transition-colors duration-[var(--motion-duration-slow)] group-data-[active=true]:text-capta-text-inverse/55 motion-reduce:transition-none">
              {content.eyebrow}
            </p>
            <h3 className="mt-4 max-w-[24rem] font-heading text-[clamp(1.65rem,3vw,2.25rem)] leading-[1.06] font-medium tracking-[-0.025em] text-pretty text-capta-text-primary transition-colors duration-[var(--motion-duration-slow)] group-data-[active=true]:text-capta-text-inverse motion-reduce:transition-none">
              {content.title}
            </h3>
            <p className="mt-5 max-w-[27rem] text-body text-pretty text-capta-text-secondary transition-colors duration-[var(--motion-duration-slow)] group-data-[active=true]:text-capta-text-inverse/65 motion-reduce:transition-none">
              {content.description}
            </p>
          </div>
        </div>
      </article>
    )
  },
)

export { ArchitecturalStackStoryCard }
export type { ArchitecturalStackStoryCardProps }
