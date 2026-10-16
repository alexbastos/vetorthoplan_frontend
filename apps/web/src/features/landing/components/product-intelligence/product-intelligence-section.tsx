import { getTranslations } from "next-intl/server"

import { LandingSectionFrame } from "../landing-section-frame"
import { OpportunityAnalysisVisual } from "./opportunity-analysis-visual"
import { ProductIntelligenceContent } from "./product-intelligence-content"
import type { OpportunityAnalysisStage, ProductCapability } from "./types"

const noticeOptionIds = ["mobility", "health", "drainage"] as const

async function ProductIntelligenceSection() {
  const t = await getTranslations("landing.productIntelligence")
  const stageIds = ["profile", "notice", "recommendation"] as const

  const capabilities: ProductCapability[] = [
    {
      description: t("capabilities.profile.description"),
      icon: "profile",
      title: t("capabilities.profile.title"),
    },
    {
      description: t("capabilities.requirements.description"),
      icon: "requirements",
      title: t("capabilities.requirements.title"),
    },
    {
      description: t("capabilities.adherence.description"),
      icon: "adherence",
      title: t("capabilities.adherence.title"),
    },
  ]

  const stages: OpportunityAnalysisStage[] = stageIds.map((id) => ({
    completedLabel: t("visual.reasoning.completed", { duration: t(`visual.stages.${id}.duration`) }),
    details: id === "profile" ? {
      priorities: [
        {
          description: t("visual.stages.profile.details.healthProject"),
          icon: "health",
          label: t("visual.stages.profile.details.priorityHealth"),
        },
        {
          description: t("visual.stages.profile.details.infrastructureProject"),
          icon: "infrastructure",
          label: t("visual.stages.profile.details.priorityInfrastructure"),
        },
      ],
      prioritiesLabel: t("visual.stages.profile.details.prioritiesLabel"),
    } : undefined,
    id,
    noticeOptions: id === "notice" ? noticeOptionIds.map((option) => ({
      counterpartyLabel: t(`visual.stages.notice.details.${option}.counterpartyLabel`),
      counterpartyValue: t(`visual.stages.notice.details.${option}.counterpartyValue`),
      deadlineLabel: t(`visual.stages.notice.details.${option}.deadlineLabel`),
      deadlineValue: t(`visual.stages.notice.details.${option}.deadlineValue`),
      title: t(`visual.stages.notice.details.${option}.title`),
    })) : undefined,
    process: t(`visual.stages.${id}.process`),
    recommendationDetails: id === "recommendation" ? {
      adherenceLabel: t("visual.stages.recommendation.details.adherenceLabel"),
      options: noticeOptionIds.map((option) => ({
        adherenceValue: t(`visual.stages.recommendation.details.${option}.adherenceValue`),
        reason: t(`visual.stages.recommendation.details.${option}.reason`),
        title: t(`visual.stages.recommendation.details.${option}.title`),
      })),
      recommendationLabel: t("visual.stages.recommendation.details.recommendationLabel"),
    } : undefined,
    result: t(`visual.stages.${id}.result`),
    summary: t(`visual.stages.${id}.summary`),
    title: t(`visual.stages.${id}.title`),
  }))

  return (
    <section id="produto" aria-labelledby="product-intelligence-title" className="relative isolate w-full border-t border-[var(--landing-grid-border)] px-4 lg:px-16">
      <LandingSectionFrame fade={false} />

      <div className="relative z-10 grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_34.5rem] lg:gap-10">
        <ProductIntelligenceContent
          action={t("action")}
          capabilities={capabilities}
          description={t("description")}
          eyebrow={t("eyebrow")}
          title={t("title")}
        />
        <OpportunityAnalysisVisual
          accessibleLabel={t("visual.accessibleLabel")}
          reasoningLabels={{
            hideDetails: t("visual.reasoning.hideDetails"),
            showDetails: t("visual.reasoning.showDetails"),
          }}
          stages={stages}
          statusLabels={{
            pending: t("visual.status.pending"),
            running: t("visual.status.running"),
            success: t("visual.status.success"),
          }}
        />
      </div>
    </section>
  )
}

export { ProductIntelligenceSection }
