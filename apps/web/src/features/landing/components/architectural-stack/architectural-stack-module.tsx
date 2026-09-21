import type { ArchitecturalStackContent } from "./architectural-stack-content"
import { ArchitecturalStackDiagram } from "./architectural-stack-diagram"
import { ArchitecturalStackNarrative } from "./architectural-stack-narrative"

type ArchitecturalStackModuleProps = {
  content: ArchitecturalStackContent
}

function ArchitecturalStackModule({ content }: ArchitecturalStackModuleProps) {
  return (
    <>
      <div className="mx-auto w-full max-w-[1512px] px-6 py-20 md:px-[120px]">
        <header
          className="grid gap-y-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.75fr)] lg:items-baseline lg:gap-x-16"
          data-architectural-stack-intro
        >
          <p className="text-overline text-capta-text-muted lg:col-span-2">{content.intro.eyebrow}</p>
          <h2
            id="architectural-stack-title"
            className="max-w-[36rem] font-heading text-heading-3 font-medium tracking-[-0.02em] text-pretty text-capta-text-primary"
          >
            {content.intro.title}
          </h2>
          <p className="max-w-[36rem] text-body text-pretty text-capta-text-secondary">
            {content.intro.description}
          </p>
        </header>
      </div>

      <ArchitecturalStackNarrative
        diagram={content.diagram}
        stage={<ArchitecturalStackDiagram content={content.diagram} />}
        stories={content.stories}
      />
    </>
  )
}

export { ArchitecturalStackModule }
export type { ArchitecturalStackModuleProps }
