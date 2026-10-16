"use client"

import { useRef, type CSSProperties } from "react"

import { useArchitecturalStackActiveStory } from "../../hooks/animations/use-architectural-stack-active-story"
import {
  architecturalStackLayerIds,
  architecturalStackStoryIds,
  type ArchitecturalStackContent,
  type ArchitecturalStackDiagramContent,
} from "./architectural-stack-content"
import { ArchitecturalStackStoryCard } from "./architectural-stack-story-card"

type ArchitecturalStackNarrativeProps = {
  diagram: ArchitecturalStackDiagramContent
  stories: ArchitecturalStackContent["stories"]
}

function ArchitecturalStackNarrative({ diagram, stories }: ArchitecturalStackNarrativeProps) {
  const storyElementsRef = useRef<(HTMLElement | null)[]>([])
  const activeStoryIndex = useArchitecturalStackActiveStory(storyElementsRef)
  const activeStoryId = architecturalStackStoryIds[activeStoryIndex] ?? architecturalStackStoryIds[0]

  return (
    <div
      className="mt-16 grid gap-5 lg:mt-24 lg:grid-cols-[minmax(19rem,29rem)_minmax(0,1fr)] lg:items-start xl:gap-8"
      data-architectural-stack-narrative
    >
      <ol className="flex flex-col gap-16 pb-8 lg:gap-0 lg:pb-0">
        {architecturalStackStoryIds.map((storyId, index) => (
          <li
            className="relative lg:min-h-svh"
            data-architectural-stack-story-wrapper={storyId}
            key={storyId}
          >
            <div className="lg:sticky lg:top-28">
              <ArchitecturalStackStoryCard
                ref={(element) => {
                  storyElementsRef.current[index] = element
                }}
                active={index === activeStoryIndex}
                content={stories[storyId]}
                index={index}
              />
            </div>
          </li>
        ))}
      </ol>

      <div className="relative lg:sticky lg:top-0 lg:flex lg:h-svh lg:items-center">
        <figure
          aria-labelledby="architectural-stack-diagram-description"
          className="relative min-h-[32rem] w-full overflow-hidden rounded-[var(--radius-token-lg)] border border-capta-border-default bg-capta-surface-workspace sm:min-h-[38rem] lg:h-[calc(100svh-4rem)] lg:max-h-[52rem] lg:min-h-0"
          data-active-story={activeStoryId}
          data-architectural-stack-stage
        >
          <figcaption id="architectural-stack-diagram-description" className="sr-only">
            {diagram.accessibleDescription}
          </figcaption>

          <div aria-hidden="true" className="flex h-full min-h-[inherit] flex-col p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-capta-border-default pb-4">
              <p className="text-meta text-capta-text-muted">{diagram.sourceGroupLabel}</p>
              <span className="size-2 rounded-full bg-capta-brand-secondary" />
            </div>

            <div className="my-auto grid gap-3 py-10 sm:gap-4 lg:py-14">
              {architecturalStackLayerIds.map((layerId, index) => {
                const layer = diagram.layers[layerId]

                return (
                  <div
                    className="relative border border-capta-border-default bg-capta-surface-card px-5 py-5 sm:px-6 sm:py-6 lg:ml-[var(--stack-layer-offset)]"
                    data-architectural-stack-layer={layerId}
                    key={layerId}
                    style={{ "--stack-layer-offset": `${index * 1.25}rem` } as CSSProperties}
                  >
                    <p className="font-heading text-heading-4 font-medium tracking-[-0.02em] text-capta-text-primary">
                      {layer.title}
                    </p>
                    <p className="mt-1.5 max-w-[32rem] text-caption text-capta-text-secondary">
                      {layer.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </figure>
      </div>
    </div>
  )
}

export { ArchitecturalStackNarrative }
export type { ArchitecturalStackNarrativeProps }
