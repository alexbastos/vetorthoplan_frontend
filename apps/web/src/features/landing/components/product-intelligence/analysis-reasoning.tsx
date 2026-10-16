"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ChevronDown } from "lucide-react"
import { useRef, useState } from "react"

import type { OpportunityAnalysisReasoningLabels, OpportunityAnalysisStage } from "./types"

gsap.registerPlugin(useGSAP)

type AnalysisReasoningProps = {
  reasoningLabels: OpportunityAnalysisReasoningLabels
  runningLabel: string
  stage: OpportunityAnalysisStage
}

function AnalysisReasoning({ reasoningLabels, runningLabel, stage }: AnalysisReasoningProps) {
  const [isOpen, setIsOpen] = useState(false)
  const scope = useRef<HTMLDivElement>(null)
  const collapsible = useRef<HTMLDivElement>(null)
  const chevron = useRef<SVGSVGElement>(null)
  const contentId = `analysis-reasoning-${stage.id}`

  useGSAP(
    () => {
      const media = gsap.matchMedia()

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const contentTween = gsap.to(collapsible.current, {
          duration: 0.3,
          ease: "power2.inOut",
          height: isOpen ? "auto" : 0,
        })
        const chevronTween = gsap.to(chevron.current, {
          duration: 0.25,
          ease: "power2.inOut",
          rotation: isOpen ? 180 : 0,
        })

        return () => {
          contentTween.kill()
          chevronTween.kill()
        }
      })

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(collapsible.current, { height: isOpen ? "auto" : 0 })
        gsap.set(chevron.current, { rotation: isOpen ? 180 : 0 })
      })

      return () => media.revert()
    },
    { dependencies: [isOpen], scope },
  )

  return (
    <div ref={scope} data-analysis-reasoning className="relative min-h-28 pt-8">
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? reasoningLabels.hideDetails : reasoningLabels.showDetails}: ${stage.title}`}
        data-analysis-reasoning-trigger
        className="invisible inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-token-sm)] text-caption font-medium text-capta-text-secondary opacity-0 outline-none hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2 aria-disabled:cursor-default aria-disabled:hover:text-capta-text-secondary"
        onClick={(event) => {
          if (event.currentTarget.getAttribute("aria-disabled") !== "false") {
            return
          }

          setIsOpen((current) => !current)
        }}
      >
        <ChevronDown ref={chevron} aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
        <span className="grid text-left">
          <span
            data-analysis-reasoning-shimmer
            data-analysis-reasoning-running-label
            className="col-start-1 row-start-1 bg-[linear-gradient(100deg,var(--color-text-secondary)_30%,var(--color-text-primary)_50%,var(--color-text-secondary)_70%)] bg-[length:220%_100%] bg-clip-text text-transparent"
          >
            {runningLabel}
          </span>
          <span data-analysis-reasoning-done-label className="invisible col-start-1 row-start-1 opacity-0">
            {stage.completedLabel}
          </span>
        </span>
      </button>

      <div className="relative mt-2">
        <div data-analysis-reasoning-running-content className="invisible absolute inset-x-0 top-0 border-l border-capta-border-default pl-4 opacity-0">
          <p className="text-caption leading-[1.66] text-capta-text-secondary">{stage.process}</p>
        </div>

        <div data-analysis-reasoning-done-content className="invisible absolute inset-x-0 top-0 opacity-0">
          <div ref={collapsible} id={contentId} className="h-0 overflow-hidden">
            <div className="border-l border-capta-border-default pb-2 pl-4">
              <p className="text-caption leading-[1.66] text-capta-text-secondary">{stage.process}</p>
            </div>
          </div>

          <p className="text-meta font-normal leading-relaxed text-capta-text-primary">{stage.result}</p>
        </div>
      </div>
    </div>
  )
}

export { AnalysisReasoning }
export type { AnalysisReasoningProps }
