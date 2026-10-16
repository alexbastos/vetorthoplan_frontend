import { getRequestConfig } from "next-intl/server"
import { cookies, headers } from "next/headers"

import { LOCALE_COOKIE_NAME } from "./locale-cookie"
import { resolveTimeZone } from "./config"
import { getMessagesForLocale } from "./messages"
import { resolveRequestLocale } from "./resolve-locale"
import { TIME_ZONE_COOKIE_NAME } from "./time-zone-cookie"

/**
 * As preferências persistidas no perfil são projetadas para cookies HttpOnly
 * nos fluxos mutáveis de autenticação/configurações. Isso torna a leitura
 * segura e barata durante a renderização; sem idioma projetado, respeitamos o
 * navegador, e sem fuso projetado usamos o padrão do produto.
 */
export default getRequestConfig(async () => {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  const locale = resolveRequestLocale({
    acceptLanguage: requestHeaders.get("accept-language"),
    cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
  })
  const timeZone = resolveTimeZone(cookieStore.get(TIME_ZONE_COOKIE_NAME)?.value)

  return { locale, messages: getMessagesForLocale(locale), timeZone }
})
