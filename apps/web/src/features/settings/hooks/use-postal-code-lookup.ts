"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useFormState, useWatch, type UseFormReturn } from "react-hook-form"

import { onlyDigits } from "@/lib/brazilian-input"
import type { ProfileValues } from "../schemas/profile.schema"
import { lookupPostalCode } from "../services/postal-code-bff-client"
import { useSettingsErrorMessage } from "./use-settings-error-message"

type PostalCodeLookupState = {
  message?: string
  status: "idle" | "invalid" | "loading" | "unavailable"
}

const INITIAL_STATE: PostalCodeLookupState = { status: "idle" }
const POSTAL_CODE_LOOKUP_DELAY_MS = 250

function usePostalCodeLookup(form: UseFormReturn<ProfileValues>): PostalCodeLookupState & { onPostalCodeChange: (value: string) => void } {
  const t = useTranslations("settings.postalCode")
  const getSettingsErrorMessage = useSettingsErrorMessage()
  const postalCodeValue = useWatch({ control: form.control, name: "zipCode" })
  const { dirtyFields } = useFormState({ control: form.control })
  const [state, setState] = useState<PostalCodeLookupState>(INITIAL_STATE)
  const resolvedPostalCode = useRef<string | undefined>(undefined)
  const clearAddress = useCallback(() => {
    form.setValue("street", "", { shouldDirty: true, shouldValidate: true })
    form.setValue("city", "", { shouldDirty: true, shouldValidate: true })
    form.setValue("state", "", { shouldDirty: true, shouldValidate: true })
    form.setValue("country", "", { shouldDirty: true, shouldValidate: true })
    resolvedPostalCode.current = undefined
    form.clearErrors("zipCode")
    setState(INITIAL_STATE)
  }, [form])
  const onPostalCodeChange = useCallback((value: string) => {
    if (onlyDigits(value).length === 0) {
      clearAddress()
    }
  }, [clearAddress])

  useEffect(() => {
    const postalCode = onlyDigits(postalCodeValue)

    if (!dirtyFields.zipCode || postalCode.length !== 8) {
      if (dirtyFields.zipCode && postalCode.length === 0) {
        clearAddress()
        return
      }

      resolvedPostalCode.current = undefined
      form.clearErrors("zipCode")
      setState(INITIAL_STATE)
      return
    }

    if (resolvedPostalCode.current === postalCode) {
      return
    }

    form.clearErrors("zipCode")
    setState({ status: "loading" })

    const controller = new AbortController()
    const lookupTimeout = window.setTimeout(async () => {
      setState({ message: t("searching"), status: "loading" })

      try {
        const result = await lookupPostalCode(postalCode, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        if (!result.ok) {
          const errorMessage = getSettingsErrorMessage(result.error.code)

          if (result.error.code === "INVALID_POSTAL_CODE" || result.error.code === "POSTAL_CODE_NOT_FOUND") {
            form.setError("zipCode", { message: errorMessage, type: "validate" })
            setState({ message: errorMessage, status: "invalid" })
            return
          }

          setState({ message: errorMessage, status: "unavailable" })
          return
        }

        form.clearErrors("zipCode")
        form.setValue("street", result.data.address.street, { shouldDirty: true, shouldValidate: true })
        form.setValue("city", result.data.address.city, { shouldDirty: true, shouldValidate: true })
        form.setValue("state", result.data.address.state, { shouldDirty: true, shouldValidate: true })
        form.setValue("country", result.data.address.country, { shouldDirty: true, shouldValidate: true })
        resolvedPostalCode.current = postalCode
        setState(INITIAL_STATE)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setState({ message: getSettingsErrorMessage("POSTAL_CODE_REQUEST_FAILED"), status: "unavailable" })
      }
    }, POSTAL_CODE_LOOKUP_DELAY_MS)

    return () => {
      controller.abort()
      window.clearTimeout(lookupTimeout)
    }
  }, [clearAddress, dirtyFields.zipCode, form, getSettingsErrorMessage, postalCodeValue, t])

  return { ...state, onPostalCodeChange }
}

export { usePostalCodeLookup }
