"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { useForm } from "react-hook-form"

import { useMfaLoginChallengeContext } from "../components/forms/mfa-login-challenge-provider"
import { createLoginSchema, type LoginValues } from "../schemas/login.schema"
import { authBffClient } from "../services/auth-bff-client"

function useLogin() {
  const tValidation = useTranslations("validation")
  const schema = useMemo(
    () => createLoginSchema({ invalidEmail: tValidation("invalidEmail"), passwordMin: tValidation("passwordMin") }),
    [tValidation],
  )
  const form = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(schema),
  })
  const { authenticate } = useMfaLoginChallengeContext()

  const onSubmit = form.handleSubmit(async (values) => {
    const resultType = await authenticate(() => authBffClient.login(values))

    if (resultType === "mfa_required") {
      form.resetField("password")
    }
  })

  return {
    form,
    isSubmitting: form.formState.isSubmitting,
    onSubmit,
  }
}

export { useLogin }
