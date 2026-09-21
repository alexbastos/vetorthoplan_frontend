type ProductCapabilityIcon = "adherence" | "profile" | "requirements"

type ProductCapability = {
  description: string
  icon: ProductCapabilityIcon
  title: string
}

type OpportunityAnalysisStageId = "notice" | "profile" | "recommendation"

type ProfilePriorityIcon = "health" | "infrastructure"

type OpportunityAnalysisStage = {
  completedLabel: string
  details?: {
    priorities: Array<{
      description: string
      icon: ProfilePriorityIcon
      label: string
    }>
    prioritiesLabel: string
  }
  id: OpportunityAnalysisStageId
  noticeOptions?: Array<{
    counterpartyLabel: string
    counterpartyValue: string
    deadlineLabel: string
    deadlineValue: string
    title: string
  }>
  recommendationDetails?: {
    adherenceLabel: string
    options: Array<{
      adherenceValue: string
      reason: string
      title: string
    }>
    recommendationLabel: string
  }
  process: string
  result: string
  summary: string
  title: string
}

type OpportunityAnalysisReasoningLabels = {
  hideDetails: string
  showDetails: string
}

type OpportunityAnalysisStatusLabels = {
  pending: string
  running: string
  success: string
}

export type { OpportunityAnalysisReasoningLabels, OpportunityAnalysisStage, OpportunityAnalysisStageId, OpportunityAnalysisStatusLabels, ProductCapability, ProductCapabilityIcon }
