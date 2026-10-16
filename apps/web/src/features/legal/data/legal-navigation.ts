const legalNavigation = [
  { id: "terms", href: "/termos-de-uso" },
  { id: "privacy", href: "/politica-de-privacidade" },
] as const

type LegalDocumentId = (typeof legalNavigation)[number]["id"]

export { legalNavigation }
export type { LegalDocumentId }
