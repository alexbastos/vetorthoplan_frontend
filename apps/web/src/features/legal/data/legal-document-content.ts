import type { AppLocale } from "@/i18n/config"

type LegalContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph" | "callout" | "review"; text: string }
  | { type: "list"; items: readonly string[] }
  | { type: "definitions"; items: readonly { term: string; description: string }[] }
  | { type: "table"; headers: readonly string[]; rows: readonly (readonly string[])[] }

type LegalDocumentContent = {
  language: AppLocale
  title: string
  lastUpdated: string
  blocks: readonly LegalContentBlock[]
}

export type { LegalContentBlock, LegalDocumentContent }
