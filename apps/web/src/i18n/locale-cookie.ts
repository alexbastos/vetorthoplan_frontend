import type { AppLocale } from "./config"

const LOCALE_COOKIE_NAME = "capta_locale"
const LOCALE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

type LocaleCookieWriter = {
  set(name: string, value: string, options: LocaleCookieOptions): void
}

type LocaleCookieOptions = {
  httpOnly: true
  maxAge: number
  path: "/"
  priority: "medium"
  sameSite: "lax"
  secure: boolean
}

const localeCookieOptions: LocaleCookieOptions = {
  httpOnly: true,
  maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
  path: "/",
  priority: "medium",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
}

/**
 * O cookie é uma projeção de leitura da preferência persistida no perfil.
 * Ele evita uma consulta remota de perfil durante a renderização de cada rota.
 */
function setLocaleCookie(cookieStore: LocaleCookieWriter, locale: AppLocale): void {
  cookieStore.set(LOCALE_COOKIE_NAME, locale, localeCookieOptions)
}

export { LOCALE_COOKIE_NAME, LOCALE_COOKIE_MAX_AGE_SECONDS, setLocaleCookie }
export type { LocaleCookieOptions, LocaleCookieWriter }
