"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { toast } from "@/lib/notifications"

import { createRegisterSchema, type RegisterValues } from "../schemas/register.schema"
import { authBffClient } from "../services/auth-bff-client"
import { useRegistrationConfirmationFlow } from "./animations/use-registration-confirmation-flow"
import { useAuthErrorNotification } from "./use-auth-error-notification"

function useRegister() {
  const t = useTranslations("validation")
  const schema = useMemo(
    () => createRegisterSchema({
      fullName: t("fullName"),
      invalidEmail: t("invalidEmail"),
      lowercase: t("passwordLowercase"),
      max: t("passwordMax"),
      min: t("passwordMin"),
      noSpaces: t("passwordNoSpaces"),
      number: t("passwordNumber"),
      special: t("passwordSpecial"),
      uppercase: t("passwordUppercase"),
    }),
    [t],
  )
  const getAuthErrorNotification = useAuthErrorNotification()
  const { startRegistrationConfirmation } = useRegistrationConfirmationFlow()
  const form = useForm<RegisterValues>({
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
    resolver: zodResolver(schema),
  })
  const mutation = useMutation({ mutationFn: authBffClient.register })

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await mutation.mutateAsync({
      email: values.email,
      name: values.name,
      password: values.password,
    })

    if (!result.ok) {
      const notification = getAuthErrorNotification(result.error)
      toast.error(notification.title, { description: notification.description })
      return
    }

    form.reset()
    startRegistrationConfirmation()
  })

  return {
    form,
    isSubmitting: mutation.isPending,
    onSubmit,
  }
}

export { useRegister }
