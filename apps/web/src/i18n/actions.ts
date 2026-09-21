"use server"

import { cookies } from "next/headers"

import { isAppLocale } from "./config"
import { setLocaleCookie } from "./locale-cookie"

/** Browser preference only; authenticated profile preferences remain unchanged. */
async function changeBrowserLocale(locale: string): Promise<void> {
  if (typeof locale !== "string" || !isAppLocale(locale)) {
    throw new Error("Unsupported locale")
  }

  setLocaleCookie(await cookies(), locale)
}

export { changeBrowserLocale }
