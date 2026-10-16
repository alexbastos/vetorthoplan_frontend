// Stable IDs define both the display order and the translation keys.
const faqQuestionIds = [
  "audience",
  "sources",
  "matching",
  "traceability",
  "humanReview",
  "gettingStarted",
] as const

type FaqQuestionId = (typeof faqQuestionIds)[number]

type FaqIntroContent = {
  eyebrow: string
  title: string
  description: string
}

type FaqQuestionContent = {
  question: string
  answer: string
}

// The section resolves translations on the server; the accordion receives text only.
type FaqContent = {
  intro: FaqIntroContent
  questions: Record<FaqQuestionId, FaqQuestionContent>
}

export { faqQuestionIds }
export type { FaqContent, FaqIntroContent, FaqQuestionContent, FaqQuestionId }
