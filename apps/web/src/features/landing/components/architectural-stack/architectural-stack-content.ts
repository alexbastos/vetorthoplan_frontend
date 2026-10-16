const architecturalStackStoryIds = ["discovery", "analysis", "decision"] as const

const architecturalStackLayerIds = ["municipality", "intelligence", "notices", "ecosystem"] as const

const architecturalStackSourceDefinitions = [
  { id: "transferegov", status: "initial" },
  { id: "dou", status: "expanding" },
  { id: "sigconMg", status: "expanding" },
  { id: "investSus", status: "expanding" },
  { id: "simec", status: "expanding" },
  { id: "novoPac", status: "expanding" },
  { id: "bdmg", status: "expanding" },
  { id: "bndes", status: "expanding" },
  { id: "more", status: "expanding" },
] as const

type ArchitecturalStackStoryId = (typeof architecturalStackStoryIds)[number]
type ArchitecturalStackLayerId = (typeof architecturalStackLayerIds)[number]
type ArchitecturalStackSourceDefinition = (typeof architecturalStackSourceDefinitions)[number]
type ArchitecturalStackSourceId = ArchitecturalStackSourceDefinition["id"]
type ArchitecturalStackSourceStatus = ArchitecturalStackSourceDefinition["status"]

type ArchitecturalStackIntroContent = {
  description: string
  eyebrow: string
  title: string
}

type ArchitecturalStackStoryContent = {
  description: string
  eyebrow: string
  title: string
}

type ArchitecturalStackLayerContent = {
  description: string
  title: string
}

type ArchitecturalStackDiagramContent = {
  accessibleDescription: string
  layers: Record<ArchitecturalStackLayerId, ArchitecturalStackLayerContent>
  sourceGroupLabel: string
  sourceLabels: Record<ArchitecturalStackSourceId, string>
  sourceStatusLabels: Record<ArchitecturalStackSourceStatus, string>
}

type ArchitecturalStackContent = {
  diagram: ArchitecturalStackDiagramContent
  intro: ArchitecturalStackIntroContent
  stories: Record<ArchitecturalStackStoryId, ArchitecturalStackStoryContent>
}

export {
  architecturalStackLayerIds,
  architecturalStackSourceDefinitions,
  architecturalStackStoryIds,
}
export type {
  ArchitecturalStackContent,
  ArchitecturalStackDiagramContent,
  ArchitecturalStackIntroContent,
  ArchitecturalStackLayerContent,
  ArchitecturalStackLayerId,
  ArchitecturalStackSourceDefinition,
  ArchitecturalStackSourceId,
  ArchitecturalStackSourceStatus,
  ArchitecturalStackStoryContent,
  ArchitecturalStackStoryId,
}
