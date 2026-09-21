import type { AppLocale } from "./config"
import en from "./messages/en"
import ptBR from "./messages/pt-BR"

const messagesByLocale = {
  "pt-BR": ptBR,
  en,
} satisfies Record<AppLocale, typeof ptBR>

function getMessagesForLocale(locale: AppLocale) {
  return messagesByLocale[locale]
}

export { getMessagesForLocale }
