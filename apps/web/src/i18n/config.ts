/**
 * Locales que o produto efetivamente oferece. Este conjunto é deliberadamente
 * fechado: entradas externas (cookie, perfil e cabeçalhos) só poderão ser
 * aceitas depois de passarem por esta lista.
 */
const appLocales = ["pt-BR", "en"] as const

type AppLocale = (typeof appLocales)[number]

const defaultLocale: AppLocale = "pt-BR"
const defaultTimeZone = "America/Sao_Paulo"

function isAppLocale(value: string): value is AppLocale {
  return appLocales.some((locale) => locale === value)
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

function resolveTimeZone(value: string | null | undefined): string {
  return value && isValidTimeZone(value) ? value : defaultTimeZone
}

export { appLocales, defaultLocale, defaultTimeZone, isAppLocale, isValidTimeZone, resolveTimeZone }
export type { AppLocale }
