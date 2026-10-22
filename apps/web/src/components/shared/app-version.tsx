"use client"

import { useTranslations } from "next-intl"

import { appVersion } from "@/lib/app-version"

function AppVersion() {
  const t = useTranslations("common")
  return <span data-app-version={appVersion}>{t("version", { version: appVersion })}</span>
}

export { AppVersion }
