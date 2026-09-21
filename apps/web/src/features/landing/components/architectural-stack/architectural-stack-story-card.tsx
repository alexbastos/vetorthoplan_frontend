import { forwardRef } from "react"

import { cn } from "@/lib/utils"

import type { ArchitecturalStackStoryContent } from "./architectural-stack-content"

type ArchitecturalStackStoryCardProps = {
  active: boolean
  content: ArchitecturalStackStoryContent
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
  function ArchitecturalStackStoryCard({ active, content }, ref) {
    return (
      <article
        ref={ref}
        data-active={active}
        data-architectural-stack-story
        className={cn(
          "group relative border border-dashed border-capta-border-default bg-capta-surface-card px-6 py-6",
          "transition-[background-color,border-color] duration-[var(--motion-duration-slow)] ease-capta-standard",
          "data-[active=true]:border-capta-surface-inverse data-[active=true]:bg-capta-surface-inverse",
          "sm:px-8 sm:py-8 motion-reduce:transition-none",
        )}
      >
        <CornerBrackets />

        <div>
          <p className="text-overline text-capta-text-muted transition-colors duration-[var(--motion-duration-slow)] group-data-[active=true]:text-capta-text-inverse/55 motion-reduce:transition-none">
            {content.eyebrow}
          </p>
          <h3 className="mt-4 max-w-[24rem] font-heading text-heading-4 font-medium tracking-[-0.025em] text-pretty text-capta-text-primary transition-colors duration-[var(--motion-duration-slow)] group-data-[active=true]:text-capta-text-inverse motion-reduce:transition-none">
            {content.title}
          </h3>
          <p className="mt-4 max-w-[27rem] text-ui leading-relaxed text-pretty text-capta-text-secondary transition-colors duration-[var(--motion-duration-slow)] group-data-[active=true]:text-capta-text-inverse/65 motion-reduce:transition-none">
            {content.description}
          </p>
        </div>
      </article>
    )
  },
)

export { ArchitecturalStackStoryCard }
export type { ArchitecturalStackStoryCardProps }
