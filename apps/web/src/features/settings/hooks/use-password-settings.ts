"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createChangePasswordSchema, type ChangePasswordValues } from "../schemas/change-password.schema"
import { settingsBffClient } from "../services/settings-bff-client"
import { useSettingsErrorMessage } from "./use-settings-error-message"

const EMPTY_CHANGE_PASSWORD_VALUES: ChangePasswordValues = {
  confirmPassword: "",
  currentPassword: "",
  newPassword: "",
}

type UsePasswordSettingsOptions = {
  onPasswordChanged?: () => void
}

function usePasswordSettings({ onPasswordChanged }: UsePasswordSettingsOptions = {}) {
  const t = useTranslations("settings.password")
  const tValidation = useTranslations("validation")
  const getSettingsErrorMessage = useSettingsErrorMessage()
  const schema = useMemo(
    () => createChangePasswordSchema({
      differentFromCurrent: tValidation("passwordDifferentFromCurrent"),
      lowercase: tValidation("passwordLowercase"),
      max: tValidation("passwordMax"),
      min: tValidation("passwordMin"),
      mismatch: tValidation("passwordMismatch"),
      noSpaces: tValidation("passwordNoSpaces"),
      number: tValidation("passwordNumber"),
      required: tValidation("required"),
      special: tValidation("passwordSpecial"),
      uppercase: tValidation("passwordUppercase"),
    }),
    [tValidation],
  )
  const form = useForm<ChangePasswordValues>({
    defaultValues: EMPTY_CHANGE_PASSWORD_VALUES,
    mode: "onChange",
    resolver: zodResolver(schema),
  })
  const changePasswordMutation = useMutation({ mutationFn: settingsBffClient.changePassword })

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    const result = await changePasswordMutation.mutateAsync({ currentPassword, newPassword })

    if (!result.ok) {
      toast.error(t("saveError"), { description: getSettingsErrorMessage(result.error.code) })
      return
    }

    form.reset()
    onPasswordChanged?.()
    toast.success(t("saved"), { description: t("savedDescription") })
  })

  return {
    form,
    isSaving: changePasswordMutation.isPending,
    onSubmit,
  }
}

export { usePasswordSettings }
