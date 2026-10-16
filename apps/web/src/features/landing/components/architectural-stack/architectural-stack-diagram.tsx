import { CaptaBrandLogo } from "@/components/ui/capta-brand-logo"

import { ArchitecturalStackBracketFrame } from "./architectural-stack-bracket-frame"
import type {
  ArchitecturalStackDiagramContent,
  ArchitecturalStackLayerContent,
  ArchitecturalStackLayerId,
} from "./architectural-stack-content"
import { ArchitecturalStackSources } from "./architectural-stack-sources"

type ArchitecturalStackDiagramProps = {
  content: ArchitecturalStackDiagramContent
}

function DiagramLayer({ content, id }: {
  content: ArchitecturalStackLayerContent
  id: ArchitecturalStackLayerId
}) {
  return (
    <ArchitecturalStackBracketFrame
      className="flex min-h-[clamp(4.5rem,12cqw,6.5rem)] flex-col justify-center px-[clamp(1rem,3cqw,1.75rem)] py-4"
      data-architectural-stack-layer={id}
    >
      <h3 className="font-heading text-[clamp(1rem,2.8cqw,1.5rem)] leading-[1.1] font-medium tracking-[-0.025em] text-pretty">
        {content.title}
      </h3>
      <p className="mt-2 text-[clamp(0.75rem,1.7cqw,0.875rem)] leading-relaxed text-pretty text-capta-text-secondary">
        {content.description}
      </p>
    </ArchitecturalStackBracketFrame>
  )
}

function ArchitecturalStackDiagram({ content }: ArchitecturalStackDiagramProps) {
  return (
    <figure
      aria-describedby="architectural-stack-diagram-description"
      className="w-full @container"
      data-architectural-stack-fallback
    >
      <figcaption id="architectural-stack-diagram-description" className="sr-only">
        {content.accessibleDescription}
      </figcaption>

      <div className="grid gap-[clamp(0.75rem,2cqw,1.25rem)]">
        <DiagramLayer content={content.layers.municipality} id="municipality" />

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,0.5fr)] gap-[clamp(0.75rem,2cqw,1.25rem)]">
          <div className="grid gap-[clamp(0.75rem,2cqw,1.25rem)]">
            <DiagramLayer content={content.layers.intelligence} id="intelligence" />
            <DiagramLayer content={content.layers.notices} id="notices" />
          </div>

          <ArchitecturalStackBracketFrame
            aria-hidden="true"
            className="flex items-center justify-center p-[clamp(0.75rem,3cqw,2rem)]"
            data-architectural-stack-brand
          >
            <CaptaBrandLogo
              alt=""
              className="h-auto w-full max-w-40 dark:invert"
              height={40}
              loading="lazy"
              priority={false}
              variant="black"
              width={160}
            />
          </ArchitecturalStackBracketFrame>
        </div>

        <ArchitecturalStackSources content={content} />
        <DiagramLayer content={content.layers.ecosystem} id="ecosystem" />
      </div>
    </figure>
  )
}

export { ArchitecturalStackDiagram }
