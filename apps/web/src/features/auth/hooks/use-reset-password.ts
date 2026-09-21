"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createResetPasswordSchema, type ResetPasswordValues } from "../schemas/reset-password.schema"
import { authBffClient } from "../services/auth-bff-client"
import { useAuthErrorNotification } from "./use-auth-error-notification"

function useResetPassword(token: string | undefined) {
  const t = useTranslations("validation")
  const tNotifications = useTranslations("auth.notifications")
  const schema = useMemo(
    () => createResetPasswordSchema({
      lowercase: t("passwordLowercase"),
      max: t("passwordMax"),
      min: t("passwordMin"),
      mismatch: t("passwordMismatch"),
      noSpaces: t("passwordNoSpaces"),
      number: t("passwordNumber"),
      special: t("passwordSpecial"),
      uppercase: t("passwordUppercase"),
    }),
    [t],
  )
  const getAuthErrorNotification = useAuthErrorNotification()
  const router = useRouter()
  const form = useForm<ResetPasswordValues>({
    defaultValues: { confirmPassword: "", password: "" },
    resolver: zodResolver(schema),
  })
  const activeTokenRef = useRef(normalizeRecoveryToken(token))
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    activeTokenRef.current = normalizeRecoveryToken(token)
    removeRecoveryTokenFromUrl()

    return () => {
      isMountedRef.current = false
      activeTokenRef.current = undefined
      form.reset()
    }
  }, [form, token])

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const activeToken = activeTokenRef.current

    if (!activeToken) {
      form.reset()
      toast.error(tNotifications("invalidRecoveryLink.title"), {
        description: tNotifications("invalidRecoveryLink.description"),
      })
      router.replace("/forgot-password")
      return
    }

    const result = await authBffClient.resetPassword({ newPassword: password, token: activeToken })

    if (!isMountedRef.current || activeTokenRef.current !== activeToken) {
      return
    }

    if (!result.ok) {
      const notification = getAuthErrorNotification(result.error)

      if (result.error.code === "INVALID_RECOVERY_LINK") {
        activeTokenRef.current = undefined
        form.reset()
        toast.error(notification.title, { description: notification.description })
        router.replace("/forgot-password")
        return
      }

      toast.error(notification.title, { description: notification.description })
      return
    }

    activeTokenRef.current = undefined
    form.reset()
    toast.success(tNotifications("passwordChanged.title"), { description: tNotifications("passwordChanged.description") })
    router.replace("/login")
    router.refresh()
  })

  return {
    form,
    isSubmitting: form.formState.isSubmitting,
    onSubmit,
  }
}

function normalizeRecoveryToken(token: string | undefined) {
  const normalized = token?.trim()
  return normalized ? normalized : undefined
}

function removeRecoveryTokenFromUrl() {
  const url = new URL(window.location.href)

  if (!url.searchParams.has("token")) {
    return
  }

  url.searchParams.delete("token")
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
}

export { useResetPassword }
