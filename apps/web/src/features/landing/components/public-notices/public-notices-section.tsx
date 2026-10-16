import { Files } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"

import { LandingSectionFrame } from "../landing-section-frame"
import { PublicNoticesShowcase } from "./public-notices-showcase"
import type {
  NoticeCategory,
  PublicNoticesFeature,
  PublicNoticesVisualContent,
} from "./types"

const noticePreviewIds = ["0", "1", "2", "3", "4", "5"] as const
const previewCategories = {
  "0": "technology",
  "1": "sustainability",
  "2": "health",
  "3": "infrastructure",
  "4": "education",
  "5": "energy",
} satisfies Record<(typeof noticePreviewIds)[number], NoticeCategory>
const pipelineColumnIds = ["0", "1", "2"] as const
const pipelineItemIds = ["0"] as const
const pipelineItemCategories = {
  "0": "infrastructure",
  "1": "health",
  "2": "sustainability",
} satisfies Record<(typeof pipelineColumnIds)[number], NoticeCategory>
const pipelineFeaturedOpportunityIds = ["0", "1", "2"] as const
const pipelineFeaturedOpportunityCategories = {
  "0": "technology",
  "1": "health",
  "2": "education",
} satisfies Record<(typeof pipelineFeaturedOpportunityIds)[number], NoticeCategory>
const dossierIds = ["0", "1", "2"] as const
const dossierCategories = {
  "0": "technology",
  "1": "infrastructure",
  "2": "health",
} as const

async function PublicNoticesSection() {
  const t = await getTranslations("landing.publicNotices")

  const features: PublicNoticesFeature[] = [
    {
      action: t("features.realtime.action"),
      description: t("features.realtime.description"),
      id: "realtime",
      title: t("features.realtime.title"),
    },
    {
      action: t("features.details.action"),
      description: t("features.details.description"),
      id: "details",
      title: t("features.details.title"),
    },
    {
      action: t("features.pipeline.action"),
      description: t("features.pipeline.description"),
      id: "pipeline",
      title: t("features.pipeline.title"),
    },
  ]

  const visualContent: PublicNoticesVisualContent = {
    realtime: {
      accessibleLabel: t("visuals.realtime.accessibleLabel"),
      analyzedLabel: t("visuals.realtime.analyzedLabel"),
      analyzedValue: t("visuals.realtime.analyzedValue"),
      heading: t("visuals.realtime.heading"),
      opportunities: noticePreviewIds.map((id) => ({
        amount: t(`visuals.realtime.opportunities.${id}.amount`),
        category: previewCategories[id],
        fit: t(`visuals.realtime.opportunities.${id}.fit`),
        organization: t(`visuals.realtime.opportunities.${id}.organization`),
        title: t(`visuals.realtime.opportunities.${id}.title`),
      })),
      summaryLabel: t("visuals.realtime.summaryLabel"),
      summaryValue: t("visuals.realtime.summaryValue"),
      todayLabel: t("visuals.realtime.todayLabel"),
    },
    details: {
      accessibleLabel: t("visuals.details.accessibleLabel"),
      amountLabel: t("visuals.details.amountLabel"),
      deadlineLabel: t("visuals.details.deadlineLabel"),
      dossiers: dossierIds.map((id) => ({
        amountValue: t(`visuals.details.dossiers.${id}.amountValue`),
        category: dossierCategories[id],
        deadlineValue: t(`visuals.details.dossiers.${id}.deadlineValue`),
        id,
        opinion: t(`visuals.details.dossiers.${id}.opinion`),
        organization: t(`visuals.details.dossiers.${id}.organization`),
        requirementsValue: t(`visuals.details.dossiers.${id}.requirementsValue`),
        title: t(`visuals.details.dossiers.${id}.title`),
      })),
      heading: t("visuals.details.heading"),
      recommendationTitle: t("visuals.details.recommendationTitle"),
      requirementsLabel: t("visuals.details.requirementsLabel"),
      selectorDescription: t("visuals.details.selectorDescription"),
      summaryLabel: t("visuals.details.summaryLabel"),
    },
    pipeline: {
      accessibleLabel: t("visuals.pipeline.accessibleLabel"),
      columns: pipelineColumnIds.map((columnId) => ({
        items: pipelineItemIds.map((itemId) => ({
          category: pipelineItemCategories[columnId],
          deadline: t(`visuals.pipeline.columns.${columnId}.items.${itemId}.deadline`),
          title: t(`visuals.pipeline.columns.${columnId}.items.${itemId}.title`),
        })),
        title: t(`visuals.pipeline.columns.${columnId}.title`),
      })),
      featuredOpportunities: pipelineFeaturedOpportunityIds.map((id) => ({
        category: pipelineFeaturedOpportunityCategories[id],
        deadline: t(`visuals.pipeline.featuredOpportunities.${id}.deadline`),
        organization: t(`visuals.pipeline.featuredOpportunities.${id}.organization`),
        progressLabel: t(`visuals.pipeline.featuredOpportunities.${id}.progressLabel`),
        progressValue: t(`visuals.pipeline.featuredOpportunities.${id}.progressValue`),
        title: t(`visuals.pipeline.featuredOpportunities.${id}.title`),
      })),
      heading: t("visuals.pipeline.heading"),
      periodLabel: t("visuals.pipeline.periodLabel"),
    },
  }

  return (
    <section id="editais" aria-labelledby="public-notices-title" className="relative isolate w-full">
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 z-0 h-px w-screen -translate-x-1/2 bg-[var(--landing-grid-border)]"
      />
      <LandingSectionFrame fade={false} />

      <div className="relative z-10 px-4 py-16 lg:px-16 lg:py-20">
        <div className="max-w-[39rem]">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-sm bg-capta-product-notices text-capta-text-inverse">
              <Files className="size-3" strokeWidth={2.25} />
            </span>
            <p className="text-meta font-medium text-capta-text-secondary">{t("intro.eyebrow")}</p>
          </div>

          <h2 id="public-notices-title" className="mt-4 font-heading text-heading-3 font-medium tracking-[-0.02em] text-pretty text-capta-text-primary">
            {t("intro.title")}
          </h2>
          <p className="mt-4 max-w-[37rem] text-body text-pretty text-capta-text-secondary">{t("intro.description")}</p>

          <Button asChild className="mt-7" size="sm" variant="secondary">
            <Link href="#editais-showcase">{t("intro.action")}</Link>
          </Button>
        </div>
      </div>

      <PublicNoticesShowcase features={features} tabsLabel={t("tabsLabel")} visualContent={visualContent} />
    </section>
  )
}

export { PublicNoticesSection }
