import { appLocales, defaultLocale, isAppLocale, type AppLocale } from "./config"

type LocaleRequestInput = {
  acceptLanguage: string | null
  cookieLocale: string | undefined
}

/**
 * Resolve somente valores confiáveis para o catálogo da aplicação. O cookie
 * representa a preferência do perfil; o cabeçalho do navegador é usado apenas
 * quando ela ainda não foi escolhida ou não está disponível nesta sessão.
 */
function resolveRequestLocale({ acceptLanguage, cookieLocale }: LocaleRequestInput): AppLocale {
  if (cookieLocale && isAppLocale(cookieLocale)) {
    return cookieLocale
  }

  return resolveBrowserLocale(acceptLanguage) ?? defaultLocale
}

function resolveBrowserLocale(acceptLanguage: string | null): AppLocale | undefined {
  if (!acceptLanguage) {
    return undefined
  }

  const requestedLocales = acceptLanguage
    .split(",")
    .map(parseLanguageRange)
    .filter((entry): entry is { locale: string; quality: number } => entry !== undefined)
    .filter((entry) => entry.quality > 0)
    .sort((first, second) => second.quality - first.quality)

  for (const { locale } of requestedLocales) {
    const supportedLocale = matchSupportedLocale(locale)

    if (supportedLocale) {
      return supportedLocale
    }
  }

  return undefined
}

function parseLanguageRange(value: string): { locale: string; quality: number } | undefined {
  const [languageRange, ...parameters] = value.trim().split(";")

  if (!languageRange || languageRange === "*") {
    return undefined
  }

  const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="))
  const qualityValue = qualityParameter?.trim().slice(2)
  const quality = qualityValue === undefined ? 1 : Number(qualityValue)

  if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
    return undefined
  }

  return { locale: languageRange.replaceAll("_", "-"), quality }
}

function matchSupportedLocale(requestedLocale: string): AppLocale | undefined {
  const normalizedLocale = requestedLocale.toLowerCase()
  const exactMatch = appLocales.find((locale) => locale.toLowerCase() === normalizedLocale)

  if (exactMatch) {
    return exactMatch
  }

  const language = normalizedLocale.split("-", 1)[0]

  return appLocales.find((locale) => locale.toLowerCase().split("-", 1)[0] === language)
}

export { resolveRequestLocale }
export type { LocaleRequestInput }
