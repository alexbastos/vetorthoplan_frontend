const communityFactKeys = ["professionals", "conversations", "cases", "perspectives"] as const
const communityFaqKeys = ["availability", "conversations", "sharing", "decisions"] as const

const communityModules = [
  { id: "connections", code: "CO-01" },
  { id: "cases", code: "CO-02" },
  { id: "discussion", code: "CO-03" },
] as const

type CommunityModuleId = typeof communityModules[number]["id"]

export { communityFactKeys, communityFaqKeys, communityModules }
export type { CommunityModuleId }
