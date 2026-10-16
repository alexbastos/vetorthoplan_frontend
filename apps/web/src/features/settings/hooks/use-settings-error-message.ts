"use client"

import { useTranslations } from "next-intl"
import { useCallback } from "react"

import type { SettingsBffErrorCode } from "../types/settings"

function useSettingsErrorMessage() {
  const t = useTranslations("settings.errors")

  return useCallback((code: SettingsBffErrorCode): string => {
    switch (code) {
      case "INVALID_POSTAL_CODE":
        return t("invalidPostalCode")
      case "POSTAL_CODE_NOT_FOUND":
        return t("postalCodeNotFound")
      case "POSTAL_CODE_REQUEST_FAILED":
      case "POSTAL_CODE_UNAVAILABLE":
        return t("postalCodeUnavailable")
      case "SESSION_UNAVAILABLE":
        return t("sessionUnavailable")
      case "REQUEST_NOT_ALLOWED":
        return t("requestNotAllowed")
      case "RATE_LIMITED":
        return t("rateLimited")
      case "NETWORK_ERROR":
        return t("network")
      case "SERVICE_UNAVAILABLE":
        return t("serviceUnavailable")
      case "VALIDATION_ERROR":
        return t("validationError")
      default:
        return t("requestFailed")
    }
  }, [t])
}

export { useSettingsErrorMessage }
