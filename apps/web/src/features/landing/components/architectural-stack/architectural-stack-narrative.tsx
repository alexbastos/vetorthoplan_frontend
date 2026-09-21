"use client"

import { useRef, type ReactNode } from "react"

import { useArchitecturalStackActiveStory } from "../../hooks/animations/use-architectural-stack-active-story"
import {
  architecturalStackStoryIds,
  type ArchitecturalStackContent,
  type ArchitecturalStackDiagramContent,
} from "./architectural-stack-content"
import { ArchitecturalStackStoryCard } from "./architectural-stack-story-card"
import { ArchitecturalStackStage } from "./architectural-stack-stage"

type ArchitecturalStackNarrativeProps = {
  stage: ReactNode
  diagram: ArchitecturalStackDiagramContent
  stories: ArchitecturalStackContent["stories"]
}

function ArchitecturalStackNarrative({ diagram, stage, stories }: ArchitecturalStackNarrativeProps) {
  const trigger = useRef<HTMLDivElement>(null)
  const storyElementsRef = useRef<(HTMLElement | null)[]>([])
  const activeStoryIndex = useArchitecturalStackActiveStory(storyElementsRef)
  const activeStoryId = architecturalStackStoryIds[activeStoryIndex] ?? architecturalStackStoryIds[0]

  return (
    <div
      ref={trigger}
      className="relative grid w-full grid-cols-1 gap-8 px-6 md:pl-[max(120px,calc((100vw-1512px)/2+120px))] lg:grid-cols-[460px_minmax(0,1fr)] lg:items-start lg:gap-16 lg:pr-12"
      data-architectural-stack-narrative
    >
      <ol className="flex flex-col gap-16 pb-16">
        {architecturalStackStoryIds.map((storyId, index) => (
          <li
            className="relative lg:h-screen"
            data-architectural-stack-story-wrapper={storyId}
            key={storyId}
          >
            <div className="lg:sticky lg:top-32">
              <ArchitecturalStackStoryCard
                ref={(element) => {
                  storyElementsRef.current[index] = element
                }}
                active={index === activeStoryIndex}
                content={stories[storyId]}
              />
            </div>
          </li>
        ))}
      </ol>

      <div
        className="relative w-full lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center"
        data-active-story={activeStoryId}
        data-architectural-stack-stage
      >
        <ArchitecturalStackStage content={diagram} fallback={stage} trigger={trigger} />
      </div>
    </div>
  )
}

export { ArchitecturalStackNarrative }
export type { ArchitecturalStackNarrativeProps }
