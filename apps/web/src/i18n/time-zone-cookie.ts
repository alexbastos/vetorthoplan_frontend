import { resolveTimeZone } from "./config"

const TIME_ZONE_COOKIE_NAME = "capta_time_zone"
const TIME_ZONE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

type TimeZoneCookieWriter = {
  set(name: string, value: string, options: TimeZoneCookieOptions): void
}

type TimeZoneCookieOptions = {
  httpOnly: true
  maxAge: number
  path: "/"
  priority: "medium"
  sameSite: "lax"
  secure: boolean
}

const timeZoneCookieOptions: TimeZoneCookieOptions = {
  httpOnly: true,
  maxAge: TIME_ZONE_COOKIE_MAX_AGE_SECONDS,
  path: "/",
  priority: "medium",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
}

function setTimeZoneCookie(cookieStore: TimeZoneCookieWriter, timeZone: string | null | undefined): void {
  cookieStore.set(TIME_ZONE_COOKIE_NAME, resolveTimeZone(timeZone), timeZoneCookieOptions)
}

export { TIME_ZONE_COOKIE_MAX_AGE_SECONDS, TIME_ZONE_COOKIE_NAME, setTimeZoneCookie }
export type { TimeZoneCookieOptions, TimeZoneCookieWriter }
