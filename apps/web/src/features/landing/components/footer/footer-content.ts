// Stable IDs define the display order and translation keys; destinations are not translated.
// Keep this navigation independent from the header's unfinished section anchors.
const footerNavigationGroups = [
  {
    id: "product",
    links: [
      { id: "product", href: "#produto" },
      { id: "publicNotices", href: "#editais" },
      { id: "howItWorks", href: "#como-funciona" },
    ],
  },
  {
    id: "platform",
    links: [
      { id: "faq", href: "#faq" },
      { id: "register", href: "/register" },
      { id: "login", href: "/login" },
    ],
  },
  {
    id: "legal",
    links: [
      { id: "terms", href: "/termos-de-uso" },
      { id: "privacy", href: "/politica-de-privacidade" },
    ],
  },
] as const

type FooterNavigationGroupId = (typeof footerNavigationGroups)[number]["id"]
type FooterLinkId = (typeof footerNavigationGroups)[number]["links"][number]["id"]

// The footer resolves translations and the copyright year on the server.
type FooterContent = {
  brandDescription: string
  navigationLabel: string
  homeLinkLabel: string
  groupLabels: Record<FooterNavigationGroupId, string>
  linkLabels: Record<FooterLinkId, string>
  footerStatus: string
  footerCenter: string
  copyright: string
}

export { footerNavigationGroups }
export type { FooterContent, FooterLinkId, FooterNavigationGroupId }
