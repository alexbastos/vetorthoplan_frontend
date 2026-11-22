const visualSimulationFactKeys = ["osteotomy", "fragment", "rotation", "review"] as const
const visualSimulationFaqKeys = ["setup", "rotation", "reference", "saved"] as const

const visualSimulationModules = [
  { id: "fragment", code: "VS-01" },
  { id: "rotation", code: "VS-02" },
  { id: "review", code: "VS-03" },
] as const

type VisualSimulationModuleId = typeof visualSimulationModules[number]["id"]

export { visualSimulationFactKeys, visualSimulationFaqKeys, visualSimulationModules }
export type { VisualSimulationModuleId }
