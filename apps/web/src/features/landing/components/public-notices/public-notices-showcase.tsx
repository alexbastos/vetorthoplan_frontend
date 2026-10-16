"use client"

import { ArrowRight, Columns3, FileSearch, RadioTower } from "lucide-react"
import { Tabs } from "radix-ui"
import { useMemo, useRef } from "react"

import { cn } from "@/lib/utils"

import { usePublicNoticesPanelTransition } from "../../hooks/animations/use-public-notices-panel-transition"
import { usePublicNoticesTabsAutoplay } from "../../hooks/animations/use-public-notices-tabs-autoplay"
import { CapturePipelineVisual } from "./visuals/capture-pipeline-visual"
import { OpportunityDetailsVisual } from "./visuals/opportunity-details-visual"
import { RealtimeRadarVisual } from "./visuals/realtime-radar-visual"
import type { PublicNoticesFeature, PublicNoticesFeatureId, PublicNoticesVisualContent } from "./types"

const featureIcons = {
  details: FileSearch,
  pipeline: Columns3,
  realtime: RadioTower,
} satisfies Record<PublicNoticesFeatureId, typeof RadioTower>

type PublicNoticesShowcaseProps = {
  features: PublicNoticesFeature[]
  tabsLabel: string
  visualContent: PublicNoticesVisualContent
}

const panelClassName = cn(
  "invisible absolute inset-0 z-0 h-full translate-y-3 opacity-0 outline-none",
  "will-change-[opacity,transform] motion-reduce:transform-none",
)

function PublicNoticesShowcase({ features, tabsLabel, visualContent }: PublicNoticesShowcaseProps) {
  const scope = useRef<HTMLDivElement>(null)
  const featureIds = useMemo(() => features.map((feature) => feature.id), [features])
  const initialFeatureId = useRef(featureIds[0] ?? "realtime").current
  const { activeFeatureId, handleValueChange, stopAutoPlay } = usePublicNoticesTabsAutoplay(scope, featureIds)
  const isRealtimeActive = activeFeatureId === "realtime"
  const isDetailsActive = activeFeatureId === "details"
  const isPipelineActive = activeFeatureId === "pipeline"

  usePublicNoticesPanelTransition(scope, activeFeatureId)

  return (
    <Tabs.Root
      ref={scope}
      value={activeFeatureId}
      onValueChange={handleValueChange}
      id="editais-showcase"
      className="relative z-10 border-x border-t border-[var(--landing-grid-border)] bg-capta-surface-workspace"
    >
      <div className="relative z-10 h-[24rem] overflow-hidden sm:h-[30rem]">
        <Tabs.Content
          forceMount
          value="realtime"
          data-public-notices-panel="realtime"
          aria-hidden={!isRealtimeActive}
          inert={!isRealtimeActive}
          tabIndex={isRealtimeActive ? 0 : -1}
          className={cn(
            panelClassName,
            initialFeatureId === "realtime" && "visible z-10 translate-y-0 opacity-100",
          )}
        >
          <RealtimeRadarVisual
            content={visualContent.realtime}
            isActive={isRealtimeActive}
          />
        </Tabs.Content>
        <Tabs.Content
          forceMount
          value="details"
          data-public-notices-panel="details"
          aria-hidden={!isDetailsActive}
          inert={!isDetailsActive}
          tabIndex={isDetailsActive ? 0 : -1}
          className={cn(
            panelClassName,
            initialFeatureId === "details" && "visible z-10 translate-y-0 opacity-100",
          )}
        >
          <OpportunityDetailsVisual
            content={visualContent.details}
            isActive={isDetailsActive}
            onInteraction={stopAutoPlay}
          />
        </Tabs.Content>
        <Tabs.Content
          forceMount
          value="pipeline"
          data-public-notices-panel="pipeline"
          aria-hidden={!isPipelineActive}
          inert={!isPipelineActive}
          tabIndex={isPipelineActive ? 0 : -1}
          className={cn(
            panelClassName,
            initialFeatureId === "pipeline" && "visible z-10 translate-y-0 opacity-100",
          )}
        >
          <CapturePipelineVisual content={visualContent.pipeline} isActive={isPipelineActive} />
        </Tabs.Content>
      </div>

      <Tabs.List
        aria-label={tabsLabel}
        className="relative z-10 mx-auto grid w-full max-w-[50rem] grid-cols-1 gap-x-10 gap-y-8 px-6 py-8 sm:grid-cols-3 sm:px-0"
      >
        {features.map((feature) => {
          const Icon = featureIcons[feature.id]

          return (
            <Tabs.Trigger
              value={feature.id}
              key={feature.id}
              onFocus={stopAutoPlay}
              onPointerDown={stopAutoPlay}
              className={cn(
                "group relative flex min-w-0 cursor-pointer flex-col rounded-sm pr-2 pl-6 text-left text-capta-text-primary outline-none",
                "opacity-50 transition-opacity duration-500 hover:opacity-70 data-[state=active]:opacity-100",
                "focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-4 focus-visible:ring-offset-capta-surface-workspace",
              )}
            >
              <span aria-hidden="true" className="absolute top-0 -left-px h-full w-px overflow-hidden bg-capta-border-default">
                <span
                  data-public-notices-tab-progress={feature.id}
                  className="block size-full bg-capta-brand-primary opacity-0"
                />
              </span>
              <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
              <span className="mt-3 block text-ui font-semibold">{feature.title}</span>
              <span className="mt-3.5 block max-w-[15rem] text-ui text-capta-text-secondary">
                {feature.description}
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-ui font-semibold text-capta-text-secondary transition-colors duration-500 group-data-[state=active]:text-capta-brand-primary">
                {feature.action}
                <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Tabs.Trigger>
          )
        })}
      </Tabs.List>
    </Tabs.Root>
  )
}

export { PublicNoticesShowcase }
export type { PublicNoticesShowcaseProps }
