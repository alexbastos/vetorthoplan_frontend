import { Check, Plus } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"

import { ArchitecturalStackBracketFrame } from "./architectural-stack-bracket-frame"
import {
  architecturalStackSourceDefinitions,
  architecturalStackSourceLogoSources,
  type ArchitecturalStackDiagramContent,
} from "./architectural-stack-content"

type ArchitecturalStackSourcesProps = {
  content: ArchitecturalStackDiagramContent
}

function ArchitecturalStackSources({ content }: ArchitecturalStackSourcesProps) {
  return (
    <div data-architectural-stack-sources>
      <p className="text-[clamp(0.75rem,1.7cqw,0.875rem)] font-medium text-capta-text-secondary">
        {content.sourceGroupLabel}
      </p>

      <ul className="mt-3 grid grid-cols-3 gap-2 @min-[32rem]:grid-cols-5 @min-[48rem]:grid-cols-9" role="list">
        {architecturalStackSourceDefinitions.map(({ id, status }) => {
          const isInitial = status === "initial"
          const logoSource = architecturalStackSourceLogoSources[id]
          const StatusIcon = isInitial ? Check : Plus

          return (
            <li key={id}>
              <ArchitecturalStackBracketFrame
                className={cn(
                  "flex h-full min-h-16 items-center justify-center px-2 py-5 text-center",
                  isInitial && "border-solid border-capta-brand-secondary bg-capta-surface-card",
                )}
                data-architectural-stack-source={id}
                data-source-status={status}
              >
                <StatusIcon
                  aria-hidden="true"
                  className={cn(
                    "absolute top-1.5 right-1.5 size-2.5 text-capta-text-muted",
                    isInitial && "text-capta-brand-secondary",
                  )}
                  strokeWidth={2}
                />
                {logoSource ? (
                  <Image
                    src={logoSource}
                    alt={content.sourceLabels[id]}
                    width={1075}
                    height={1080}
                    className="h-12 w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="min-w-0 text-[clamp(0.6875rem,1.5cqw,0.8125rem)] leading-snug font-semibold wrap-anywhere text-capta-text-primary">
                    {content.sourceLabels[id]}
                  </span>
                )}
                <span className="sr-only"> — {content.sourceStatusLabels[status]}</span>
              </ArchitecturalStackBracketFrame>
            </li>
          )
        })}
      </ul>

    </div>
  )
}

export { ArchitecturalStackSources }
