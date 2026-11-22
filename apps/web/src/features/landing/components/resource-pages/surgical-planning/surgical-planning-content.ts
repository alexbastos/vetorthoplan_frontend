const surgicalPlanningFactKeys = ["references", "orientation", "osteotomy", "review"] as const
const surgicalPlanningFaqKeys = ["references", "tpa", "osteotomy", "simulation", "review"] as const

const surgicalPlanningModules = [
  { id: "axes", code: "SP-01" },
  { id: "orientation", code: "SP-02" },
  { id: "osteotomy", code: "SP-03" },
] as const

type SurgicalPlanningModuleId = typeof surgicalPlanningModules[number]["id"]

export { surgicalPlanningFactKeys, surgicalPlanningFaqKeys, surgicalPlanningModules }
export type { SurgicalPlanningModuleId }
