"use client"

import { useCallback, useEffect } from "react"
import { useFormState, type UseFormReturn } from "react-hook-form"

import { useUnsavedChangesGuard, type UnsavedChange } from "@/components/shared/app-shell/unsaved-changes-guard"

import type { ProfileEditableField } from "../lib/profile-form-fields"
import type { ProfileValues } from "../schemas/profile.schema"

type ProfileFormScopeOptions<Field extends ProfileEditableField> = {
  fields: readonly Field[]
  form: UseFormReturn<ProfileValues>
  getLabel: (field: Field) => string
  isActive: boolean
  onDiscardChanges?: () => void
}

function useProfileFormScope<Field extends ProfileEditableField>({ fields, form, getLabel, isActive, onDiscardChanges }: ProfileFormScopeOptions<Field>) {
  const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
  const { dirtyFields } = useFormState({ control: form.control })
  const hasUnsavedChanges = fields.some((field) => dirtyFields[field])

  const discardChanges = useCallback(() => {
    for (const field of fields) {
      form.resetField(field)
    }
    onDiscardChanges?.()
  }, [fields, form, onDiscardChanges])

  const hasCurrentUnsavedChanges = useCallback(
    () => fields.some((field) => form.getFieldState(field).isDirty),
    [fields, form],
  )

  const getUnsavedChanges = useCallback((): UnsavedChange[] => {
    const values = form.getValues()
    const defaults = form.formState.defaultValues ?? {}

    return fields
      .filter((field) => form.getFieldState(field).isDirty)
      .map((field) => ({
        field,
        label: getLabel(field),
        previousValue: defaults[field] ?? "",
        value: values[field],
      }))
  }, [fields, form, getLabel])

  useEffect(() => {
    if (!isActive) return

    return registerUnsavedChangesHandler({
      discardChanges,
      getUnsavedChanges,
      hasUnsavedChanges: hasCurrentUnsavedChanges,
    })
  }, [discardChanges, getUnsavedChanges, hasCurrentUnsavedChanges, isActive, registerUnsavedChangesHandler])

  useEffect(() => {
    if (!isActive || !hasUnsavedChanges) return

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)

    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [hasUnsavedChanges, isActive])

  return { discardChanges, hasUnsavedChanges }
}

export { useProfileFormScope }
