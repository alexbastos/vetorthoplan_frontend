type PublicNoticesFeatureId = "realtime" | "details" | "pipeline"

type PublicNoticesFeature = {
  action: string
  description: string
  id: PublicNoticesFeatureId
  title: string
}

type NoticeCategory = "education" | "energy" | "health" | "infrastructure" | "sustainability" | "technology"

type NoticePreview = {
  amount: string
  category: NoticeCategory
  fit: string
  organization: string
  title: string
}

type RealtimeRadarVisualContent = {
  accessibleLabel: string
  analyzedLabel: string
  analyzedValue: string
  heading: string
  opportunities: NoticePreview[]
  summaryLabel: string
  summaryValue: string
  todayLabel: string
}

type OpportunityDossierCategory = "health" | "infrastructure" | "technology"

type OpportunityDossier = {
  amountValue: string
  category: OpportunityDossierCategory
  deadlineValue: string
  id: string
  opinion: string
  organization: string
  requirementsValue: string
  title: string
}

type OpportunityDetailsVisualContent = {
  accessibleLabel: string
  amountLabel: string
  deadlineLabel: string
  dossiers: OpportunityDossier[]
  heading: string
  recommendationTitle: string
  requirementsLabel: string
  selectorDescription: string
  summaryLabel: string
}

type PipelineItem = {
  category: NoticeCategory
  deadline: string
  title: string
}

type PipelineColumn = {
  items: PipelineItem[]
  title: string
}

type PipelineFeaturedOpportunity = {
  category: NoticeCategory
  deadline: string
  organization: string
  progressLabel: string
  progressValue: string
  title: string
}

type CapturePipelineVisualContent = {
  accessibleLabel: string
  columns: PipelineColumn[]
  featuredOpportunities: PipelineFeaturedOpportunity[]
  heading: string
  periodLabel: string
}

type PublicNoticesVisualContent = {
  details: OpportunityDetailsVisualContent
  pipeline: CapturePipelineVisualContent
  realtime: RealtimeRadarVisualContent
}

export type {
  CapturePipelineVisualContent,
  NoticeCategory,
  NoticePreview,
  OpportunityDossier,
  OpportunityDossierCategory,
  OpportunityDetailsVisualContent,
  PipelineItem,
  PublicNoticesFeature,
  PublicNoticesFeatureId,
  PublicNoticesVisualContent,
  PipelineFeaturedOpportunity,
  RealtimeRadarVisualContent,
}
