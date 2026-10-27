"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm, useWatch, type DefaultValues } from "react-hook-form"
import { toast } from "@/lib/notifications"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"

import { caseCreateFieldIssues, prepareCreateAttempt, toCreateCaseRequest, type CreateAttempt } from "../lib/new-case-request"
import { createNewCaseFormSchema, type NewCaseFormValues } from "../schemas/new-case-form.schema"
import { CaseCreateRequestError, createCase } from "../services/case-create-api"
import type { CaseDetail } from "../types/case-detail"
import { casesQueryKeys } from "./cases-query-keys"

const NEW_CASE_DEFAULT_VALUES = {
  ageYears: "",
  ageMonths: "",
  birthDate: "",
  breed: "",
  clinicalNotes: "",
  patientName: "",
  sex: undefined,
  species: "",
  title: "",
  weightKg: "",
} satisfies DefaultValues<NewCaseFormValues>

const FORM_FIELDS = [
  "title",
  "patientName",
  "species",
  "breed",
  "sex",
  "ageYears",
  "ageMonths",
  "birthDate",
  "weightKg",
  "clinicalNotes",
] as const

type UseNewCaseFormOptions = { onCreated: (created: CaseDetail) => void }

function useNewCaseForm({ onCreated }: UseNewCaseFormOptions) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations("cases.newCase")
  const { registerUnsavedChangesHandler, requestNavigation } = useUnsavedChangesGuard()
  const schema = useMemo(() => createNewCaseFormSchema({
    ageMonths: t("validation.ageMonths"),
    ageYears: t("validation.ageYears"),
    ageLimit: t("validation.ageLimit"),
    birthDate: t("validation.birthDate"),
    breedMax: t("validation.breedMax"),
    clinicalNotesMax: t("validation.clinicalNotesMax"),
    patientNameMax: t("validation.patientNameMax"),
    patientNameRequired: t("validation.patientNameRequired"),
    sexRequired: t("validation.sexRequired"),
    speciesMax: t("validation.speciesMax"),
    speciesRequired: t("validation.speciesRequired"),
    titleMax: t("validation.titleMax"),
    titleRequired: t("validation.titleRequired"),
    weight: t("validation.weight"),
  }), [t])
  const form = useForm<NewCaseFormValues>({
    defaultValues: NEW_CASE_DEFAULT_VALUES,
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: zodResolver(schema),
  })
  const [isCreating, setIsCreating] = useState(false)
  const submittingRef = useRef(false)
  const attemptRef = useRef<CreateAttempt | null>(null)
  const [title, patientName, species, breed, sex, ageYears, ageMonths, birthDate, weightKg, clinicalNotes] = useWatch({
    control: form.control,
    name: ["title", "patientName", "species", "breed", "sex", "ageYears", "ageMonths", "birthDate", "weightKg", "clinicalNotes"],
  })
  const completion = getFormCompletion([
    title,
    patientName,
    species,
    breed,
    sex ?? "",
    birthDate || ageYears || ageMonths,
    weightKg,
    clinicalNotes,
  ])

  const discardChanges = useCallback(() => {
    form.reset(NEW_CASE_DEFAULT_VALUES)
  }, [form])
  const hasUnsavedChanges = useCallback(() => form.formState.isDirty, [form.formState.isDirty])
  const getUnsavedChanges = useCallback(() => {
    const values = form.getValues()

    return FORM_FIELDS
      .filter((field) => form.getFieldState(field).isDirty)
      .map((field) => ({
        field,
        label: getFieldLabel(field, t),
        previousValue: getDisplayValue(field, NEW_CASE_DEFAULT_VALUES[field], t),
        value: getDisplayValue(field, values[field], t),
      }))
  }, [form, t])

  useEffect(
    () => registerUnsavedChangesHandler({ discardChanges, getUnsavedChanges, hasUnsavedChanges }),
    [discardChanges, getUnsavedChanges, hasUnsavedChanges, registerUnsavedChangesHandler],
  )

  useEffect(() => {
    if (!form.formState.isDirty) {
      return
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [form.formState.isDirty])

  const cancel = useCallback(() => {
    requestNavigation(() => router.push("/app/cases"))
  }, [requestNavigation, router])

  const onSubmit = form.handleSubmit(async (values) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setIsCreating(true)
    const body = toCreateCaseRequest(values)
    const attempt = prepareCreateAttempt(attemptRef.current, body)
    attemptRef.current = attempt

    try {
      const created = await createCase(attempt.body, attempt.key)
      attemptRef.current = null
      form.reset(values)
      void queryClient.invalidateQueries({ queryKey: casesQueryKeys.list() })
      onCreated(created)
    } catch (error) {
      if (error instanceof CaseCreateRequestError) {
        if (error.code === "REQUEST_VALIDATION_ERROR" || error.code === "CASE_VALIDATION_ERROR") {
          for (const { field, message } of caseCreateFieldIssues(error.fieldErrors, Boolean(values.birthDate))) {
            form.setError(field, { type: "server", message: t(`validation.${message}`) })
          }
        }
        const message = error.code === "IDEMPOTENCY_KEY_REUSED"
          ? t("notifications.conflictError")
          : error.code === "REQUEST_VALIDATION_ERROR" || error.code === "CASE_VALIDATION_ERROR"
            ? t("notifications.validationError")
            : error.retryable ? t("notifications.retryError") : t("notifications.genericError")
        toast.error(t("notifications.createErrorTitle"), { description: message })
      } else {
        toast.error(t("notifications.createErrorTitle"), { description: t("notifications.genericError") })
      }
    } finally {
      submittingRef.current = false
      setIsCreating(false)
    }
  })

  return { cancel, completion, form, isCreating, onSubmit }
}

function getFormCompletion(values: readonly string[]): number {
  const completedFields = values.filter((value) => value.trim().length > 0).length
  return Math.round((completedFields / values.length) * 100)
}

function getFieldLabel(field: (typeof FORM_FIELDS)[number], t: ReturnType<typeof useTranslations<"cases.newCase">>): string {
  switch (field) {
    case "title": return t("fields.title")
    case "patientName": return t("fields.patientName")
    case "species": return t("fields.species")
    case "breed": return t("fields.breed")
    case "sex": return t("fields.sex")
    case "ageYears": return t("fields.ageYears")
    case "ageMonths": return t("fields.ageMonths")
    case "birthDate": return t("fields.birthDate")
    case "weightKg": return t("fields.weightKg")
    case "clinicalNotes": return t("fields.clinicalNotes")
    default: return t("fields.age")
  }
}

function getDisplayValue(field: (typeof FORM_FIELDS)[number], value: string | undefined, t: ReturnType<typeof useTranslations<"cases.newCase">>): string {
  if (field === "sex") {
    if (value === "male") return t("sex.male")
    if (value === "female") return t("sex.female")
  }

  return value ?? ""
}

export { useNewCaseForm }
export type NewCaseFormController = ReturnType<typeof useNewCaseForm>
