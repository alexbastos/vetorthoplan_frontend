const demoConversations = [
  { id: "marina", name: "Marina Costa", initials: "MC", updatedAt: "2026-11-12T12:20:00Z" },
  { id: "rafael", name: "Rafael Almeida", initials: "RA", updatedAt: "2026-11-11T17:45:00Z" },
  { id: "beatriz", name: "Beatriz Lima", initials: "BL", updatedAt: "2026-11-10T13:15:00Z" },
  { id: "helena", name: "Helena Albuquerque de Mendonça", initials: "HA", updatedAt: "2026-11-09T15:00:00Z" },
] as const

const demoMembers = [
  ...demoConversations,
  { id: "camila", name: "Camila Rocha", initials: "CR" },
  { id: "andre", name: "André Ribeiro", initials: "AR" },
] as const

type DemoMember = Pick<(typeof demoMembers)[number], "id" | "name" | "initials">
type ConversationId = DemoMember["id"]
type DemoConversation = DemoMember & { updatedAt: string }
type CommunityMessageQuote = { id: string; text: string; outgoing: boolean }
type CommunityMessage = CommunityMessageQuote & { sentAt: string; replyTo?: CommunityMessageQuote }

const demoProfiles = {
  camila: { city: "Curitiba, PR", experience: 6, joinedAt: "2026-07-01", languages: ["pt"] },
  andre: { city: "Recife, PE", experience: 5, joinedAt: "2026-08-01", languages: ["pt", "en"] },
  marina: { city: "São Paulo, SP", experience: 8, joinedAt: "2026-04-01", languages: ["pt", "en"] },
  rafael: { city: "Belo Horizonte, MG", experience: 6, joinedAt: "2026-05-01", languages: ["pt"] },
  beatriz: { city: "Curitiba, PR", experience: 7, joinedAt: "2026-06-01", languages: ["pt", "es"] },
  helena: { city: "Campinas, SP", experience: 4, joinedAt: "2026-07-01", languages: ["pt"] },
} as const

const rafaelHistory = [
  { key: "first", sentAt: "2026-11-10T12:30:00Z", outgoing: false },
  { key: "second", sentAt: "2026-11-10T12:44:00Z", outgoing: true },
  { key: "third", sentAt: "2026-11-10T13:05:00Z", outgoing: false },
  { key: "fourth", sentAt: "2026-11-10T15:20:00Z", outgoing: true },
  { key: "fifth", sentAt: "2026-11-11T12:00:00Z", outgoing: false },
  { key: "sixth", sentAt: "2026-11-11T13:02:00Z", outgoing: true },
  { key: "seventh", sentAt: "2026-11-11T14:20:00Z", outgoing: false },
  { key: "eighth", sentAt: "2026-11-11T15:20:00Z", outgoing: true },
] as const

export { demoConversations, demoMembers, demoProfiles, rafaelHistory }
export type { CommunityMessage, CommunityMessageQuote, ConversationId, DemoConversation, DemoMember }
