import { enUS, ptBR, type Locale } from "date-fns/locale"

import type { AppLocale } from "./config"

const dateFnsLocales = {
  "pt-BR": ptBR,
  en: enUS,
} satisfies Record<AppLocale, Locale>

function getDateFnsLocale(locale: AppLocale): Locale {
  return dateFnsLocales[locale]
}

export { getDateFnsLocale }
