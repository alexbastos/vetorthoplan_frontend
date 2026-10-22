import type { CreateCaseRequest } from "@vetorthoplan/api-client/clinical-contract"

import type { NewCaseFormValues } from "../schemas/new-case-form.schema"
import { parseDeclaredAge } from "./case-age"

type CreateAttempt = { body: CreateCaseRequest; fingerprint: string; key: string }

const HTTP_TO_FORM_FIELD = {
  title: "title", animal_name: "patientName", species: "species", breed: "breed",
  sex: "sex", birth_date: "birthDate", approximate_age_months: "ageMonths",
  weight_kg: "weightKg", clinical_notes: "clinicalNotes",
} as const

function caseCreateFieldIssues(errors: readonly { field: string }[], hasBirthDate: boolean) {
  const issues = new Map<keyof NewCaseFormValues, "serverField" | "serverBirthAge">()
  for (const { field } of errors) {
    const formField = HTTP_TO_FORM_FIELD[field as keyof typeof HTTP_TO_FORM_FIELD]
    if (formField) issues.set(formField, "serverField")
    if (field === "approximate_age_months") {
      issues.set("ageYears", "serverField")
      if (hasBirthDate) issues.set("birthDate", "serverBirthAge")
    }
  }
  return [...issues].map(([field, message]) => ({ field, message }))
}

function prepareCreateAttempt(
  previous: CreateAttempt | null,
  body: CreateCaseRequest,
  createKey: () => string = () => crypto.randomUUID(),
): CreateAttempt {
  const fingerprint = JSON.stringify(body)
  return previous?.fingerprint === fingerprint
    ? previous
    : { body, fingerprint, key: createKey() }
}

function toCreateCaseRequest(values: NewCaseFormValues): CreateCaseRequest {
  const [weightInteger, weightFraction] = values.weightKg.replace(",", ".").split(".")
  const age = parseDeclaredAge(values.ageYears, values.ageMonths)
  return {
    title: values.title.trim(),
    animal_name: values.patientName.trim(),
    species: values.species.trim(),
    breed: values.breed.trim() || null,
    sex: values.sex === "female" ? "FEMALE" : "MALE",
    birth_date: values.birthDate || null,
    // With a known birth date, let the backend calculate on its creation date.
    // Never include the browser's preview: retries must keep the exact original body.
    approximate_age_months: !values.birthDate && age.kind === "known" ? age.totalMonths : null,
    weight_kg: values.weightKg
      ? `${Number(weightInteger)}${weightFraction === undefined ? "" : `.${weightFraction}`}`
      : null,
    clinical_notes: values.clinicalNotes.trim() || null,
  }
}

export { caseCreateFieldIssues, prepareCreateAttempt, toCreateCaseRequest }
export type { CreateAttempt }
