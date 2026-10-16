"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/config"
import { settingsBffClient } from "../services/settings-bff-client"
import type { SettingsUser } from "../types/settings"
import { useSettingsErrorMessage } from "./use-settings-error-message"

function useProfileLocale() {
  const activeLocale = useLocale()
  const locale = isAppLocale(activeLocale) ? activeLocale : defaultLocale
  const t = useTranslations("common.accountMenu")
  const getSettingsErrorMessage = useSettingsErrorMessage()
  const queryClient = useQueryClient()
  const router = useRouter()

  const { isPending, mutate } = useMutation({
    mutationFn: async (nextLocale: AppLocale) => {
      const updateResult = await settingsBffClient.updateLocale(nextLocale)
      if (!updateResult.ok) throw new Error(getSettingsErrorMessage(updateResult.error.code))

      return updateResult.data.user
    },
    onError: (error) => toast.error(t("languageSaveError"), { description: error.message }),
    onSuccess: (user) => {
      queryClient.setQueryData<SettingsUser>(["settings", "profile"], user)
      router.refresh()
    },
  })

  function selectLocale(value: string) {
    if (!isAppLocale(value) || value === locale || isPending) return
    mutate(value)
  }

  return { isSavingLocale: isPending, locale, selectLocale }
}

export { useProfileLocale }
