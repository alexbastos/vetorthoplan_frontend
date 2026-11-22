import { casesPatientsImage, measurementToolsImage, surgicalPlanningImage, visualSimulationImage, aiAssistantsImage, communityImage } from "../../data/resource-media"

const capabilityDefinitions = [
  { id: "cases", planned: false },
  { id: "measurements", planned: false },
  { id: "methods", planned: false },
  { id: "simulation", planned: false },
  { id: "assistants", planned: true },
  { id: "community", planned: true },
] as const

type CapabilityKey = typeof capabilityDefinitions[number]["id"]
type CapabilityImage = { src: string; alt: string; unoptimized?: boolean }
type CapabilityContent = { id: CapabilityKey; title: string; description: string; caption: string; actionLabel: string; comingSoon?: string; image?: CapabilityImage; href?: string }

const capabilityImages: Partial<Record<CapabilityKey, CapabilityImage>> = {
  cases: casesPatientsImage,
  measurements: measurementToolsImage,
  methods: surgicalPlanningImage,
  simulation: visualSimulationImage,
  assistants: aiAssistantsImage,
  community: communityImage,
}

export { capabilityDefinitions, capabilityImages }
export type { CapabilityKey, CapabilityImage, CapabilityContent }
