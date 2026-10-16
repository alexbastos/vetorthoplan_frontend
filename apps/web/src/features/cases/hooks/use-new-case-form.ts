"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"

import { createNewCaseFormSchema, type NewCaseFormValues } from "../schemas/new-case-form.schema"
import type { CreateCaseInput } from "../types/cases"

const NEW_CASE_DEFAULT_VALUES: NewCaseFormValues = {
  ageYears: "",
  birthDate: "",
  breed: "",
  clinicalNotes: "",
  patientName: "",
  sex: undefined,
  species: "",
  title: "",
  weightKg: "",
}

const FORM_FIELDS = [
  "title",
  "patientName",
  "species",
  "breed",
  "sex",
  "ageYears",
  "birthDate",
  "weightKg",
  "clinicalNotes",
] as const

type UseNewCaseFormOptions = {
  onContinue: (input: CreateCaseInput) => void
}

function useNewCaseForm({ onContinue }: UseNewCaseFormOptions) {
  const router = useRouter()
  const t = useTranslations("cases.newCase")
  const { registerUnsavedChangesHandler, requestNavigation } = useUnsavedChangesGuard()
  const schema = useMemo(() => createNewCaseFormSchema({
    ageYears: t("validation.ageYears"),
    birthDate: t("validation.birthDate"),
    birthDateOrAge: t("validation.birthDateOrAge"),
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
  const [title, patientName, species, breed, ageYears, birthDate, weightKg, clinicalNotes] = useWatch({
    control: form.control,
    name: ["title", "patientName", "species", "breed", "ageYears", "birthDate", "weightKg", "clinicalNotes"],
  })
  const completion = getFormCompletion([
    title,
    patientName,
    species,
    breed,
    birthDate || ageYears,
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

  const onSubmit = form.handleSubmit((values) => {
    if (values.sex) {
      onContinue(toCreateCaseInput({ ...values, sex: values.sex }))
    }
  })

  return { cancel, completion, form, isContinuing: form.formState.isSubmitting, onSubmit }
}

function getFormCompletion(values: readonly string[]): number {
  const completedFields = values.filter((value) => value.trim().length > 0).length
  return Math.round((completedFields / values.length) * 100)
}

function toCreateCaseInput(values: NewCaseFormValues & { sex: "female" | "male" }): CreateCaseInput {
  const age = values.birthDate
    ? { birthDate: values.birthDate, kind: "birth-date" as const }
    : values.ageYears
      ? { kind: "approximate-years" as const, years: Number(values.ageYears) }
      : null

  return {
    clinicalNotes: values.clinicalNotes || null,
    patient: {
      age,
      breed: values.breed || null,
      name: values.patientName,
      sex: values.sex,
      species: values.species,
      weightKg: values.weightKg ? Number(values.weightKg.replace(",", ".")) : null,
    },
    title: values.title,
  }
}

function getFieldLabel(field: (typeof FORM_FIELDS)[number], t: ReturnType<typeof useTranslations<"cases.newCase">>): string {
  switch (field) {
    case "title": return t("fields.title")
    case "patientName": return t("fields.patientName")
    case "species": return t("fields.species")
    case "breed": return t("fields.breed")
    case "sex": return t("fields.sex")
    case "ageYears": return t("fields.ageYears")
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
