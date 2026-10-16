import type { ArchitecturalStackContent } from "./architectural-stack-content"
import { ArchitecturalStackNarrative } from "./architectural-stack-narrative"

type ArchitecturalStackModuleProps = {
  content: ArchitecturalStackContent
}

function ArchitecturalStackModule({ content }: ArchitecturalStackModuleProps) {
  return (
    <div className="mx-auto w-full max-w-[94.5rem] px-4 py-20 sm:px-6 sm:py-24 lg:px-12 lg:py-32">
      <header
        className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.75fr)] lg:items-end lg:gap-16"
        data-architectural-stack-intro
      >
        <div>
          <p className="text-overline text-capta-text-muted">{content.intro.eyebrow}</p>
          <h2
            id="architectural-stack-title"
            className="mt-5 max-w-[50rem] font-heading text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.96] font-medium tracking-[-0.045em] text-balance text-capta-text-primary"
          >
            {content.intro.title}
          </h2>
        </div>

        <p className="max-w-[36rem] text-body-large text-pretty text-capta-text-secondary lg:pb-2">
          {content.intro.description}
        </p>
      </header>

      <ArchitecturalStackNarrative diagram={content.diagram} stories={content.stories} />
    </div>
  )
}

export { ArchitecturalStackModule }
export type { ArchitecturalStackModuleProps }
