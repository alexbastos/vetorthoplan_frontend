const aiAssistantsFactKeys = ["assistants", "context", "workflows", "review"] as const
const aiAssistantsFaqKeys = ["availability", "tasks", "review", "multiple"] as const

const aiAssistantsModules = [
  { id: "reports", code: "AI-01" },
  { id: "cases", code: "AI-02" },
  { id: "workflows", code: "AI-03" },
] as const

type AiAssistantsModuleId = typeof aiAssistantsModules[number]["id"]

export { aiAssistantsFactKeys, aiAssistantsFaqKeys, aiAssistantsModules }
export type { AiAssistantsModuleId }
