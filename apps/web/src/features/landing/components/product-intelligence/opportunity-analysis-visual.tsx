"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import { useOpportunityAnalysisAnimation } from "../../hooks/animations/use-opportunity-analysis-animation"
import { AnalysisConnector } from "./analysis-connector"
import { AnalysisReasoning } from "./analysis-reasoning"
import { AnalysisStageCard } from "./analysis-stage-card"
import type { OpportunityAnalysisReasoningLabels, OpportunityAnalysisStage, OpportunityAnalysisStatusLabels } from "./types"

type OpportunityAnalysisVisualProps = {
  accessibleLabel: string
  reasoningLabels: OpportunityAnalysisReasoningLabels
  stages: OpportunityAnalysisStage[]
  statusLabels: OpportunityAnalysisStatusLabels
}

function OpportunityAnalysisVisual({ accessibleLabel, reasoningLabels, stages, statusLabels }: OpportunityAnalysisVisualProps) {
  const scope = useRef<HTMLDivElement>(null)
  const [noticeOptionIndex, setNoticeOptionIndex] = useState(0)
  const noticeOptionCount = stages.find((stage) => stage.id === "notice")?.noticeOptions?.length ?? 0

  useOpportunityAnalysisAnimation(scope)

  useEffect(() => {
    if (noticeOptionCount > 1) {
      setNoticeOptionIndex(Math.floor(Math.random() * noticeOptionCount))
    }
  }, [noticeOptionCount])

  return (
    <div ref={scope} className="flex min-h-[37rem] items-center justify-center py-20 lg:py-24" role="group" aria-label={accessibleLabel}>
      <div className="grid w-full max-w-[34.5rem] grid-cols-[minmax(0,17.5rem)_minmax(0,15rem)] grid-rows-[auto_2.5rem_auto_2.5rem_auto] gap-x-8">
        {stages.map((stage, index) => {
          const stageRowClass = index === 0 ? "row-start-1" : index === 1 ? "row-start-3" : "row-start-5"
          const connectorRowClass = index === 0 ? "row-start-2" : "row-start-4"

          return (
            <div className="contents" key={stage.id}>
              <div className={cn("col-start-1", stageRowClass)}>
                <AnalysisStageCard noticeOptionIndex={noticeOptionIndex} stage={stage} statusLabels={statusLabels} />
              </div>
              <div className={cn("col-start-2", stageRowClass)}>
                <AnalysisReasoning reasoningLabels={reasoningLabels} runningLabel={statusLabels.running} stage={stage} />
              </div>
              {index < stages.length - 1 ? (
                <div className={cn("col-start-1", connectorRowClass)}>
                  <AnalysisConnector />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { OpportunityAnalysisVisual }
export type { OpportunityAnalysisVisualProps }
