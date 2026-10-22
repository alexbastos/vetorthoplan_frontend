"use client"

import { useTranslations } from "next-intl"
import { Controller, useWatch } from "react-hook-form"

import { InputField } from "@/components/ui/input-field"

import type { NewCaseFormController } from "../hooks/use-new-case-form"
import { nextCaseWeightInputValue } from "../lib/case-weight-input"
import { CaseRadioField, CaseTextareaField } from "./case-form-controls"
import { CasePatientAgeFields } from "./case-patient-age-fields"

type NewCaseFormProps = {
  controller: NewCaseFormController
}

function NewCaseForm({ controller }: NewCaseFormProps) {
  const t = useTranslations("cases.newCase")
  const { form, isCreating, onSubmit } = controller
  const clinicalNotes = useWatch({ control: form.control, name: "clinicalNotes" })
  const notesRegistration = form.register("clinicalNotes")
  const sexOptions = [
    { label: t("sex.male"), value: "male" },
    { label: t("sex.female"), value: "female" },
  ]

  return (
    <form className="space-y-7 px-5 pt-3 pb-6 sm:px-8 sm:pt-3 sm:pb-8" id="new-case-form" noValidate onSubmit={onSubmit}>
      <section aria-label={t("sections.case.title")}>
        <InputField
          {...form.register("title")}
          disabled={isCreating}
          error={form.formState.errors.title?.message}
          label={t("fields.title")}
          maxLength={200}
          placeholder={t("placeholders.title")}
          required
        />
      </section>

      <section aria-label={t("sections.patient.title")} className="border-t border-border pt-7">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <InputField
              {...form.register("patientName")}
              autoComplete="off"
              disabled={isCreating}
              error={form.formState.errors.patientName?.message}
              label={t("fields.patientName")}
              maxLength={120}
              placeholder={t("placeholders.patientName")}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <InputField
              {...form.register("species")}
              disabled={isCreating}
              error={form.formState.errors.species?.message}
              label={t("fields.species")}
              maxLength={80}
              placeholder={t("placeholders.species")}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <InputField
              {...form.register("breed")}
              disabled={isCreating}
              error={form.formState.errors.breed?.message}
              label={t("fields.breed")}
              maxLength={120}
              placeholder={t("placeholders.breed")}
            />
          </div>

          <div className="sm:col-span-3">
            <Controller
              control={form.control}
              name="weightKg"
              render={({ field, fieldState }) => (
                <InputField
                  {...field}
                  disabled={isCreating}
                  error={fieldState.error?.message}
                  inputMode="decimal"
                  label={t("fields.weightKg")}
                  onChange={(event) => {
                    const candidate = event.currentTarget.value
                    const next = nextCaseWeightInputValue(field.value, candidate)
                    if (next === candidate) field.onChange(next)
                    else event.currentTarget.value = next
                  }}
                  pattern="[0-9]{0,5}([.,][0-9]{0,2})?"
                  placeholder={t("placeholders.weightKg")}
                  spellCheck={false}
                  type="text"
                />
              )}
            />
          </div>

          <div className="sm:col-span-3">
            <CaseRadioField
              disabled={isCreating}
              error={form.formState.errors.sex?.message}
              label={t("fields.sex")}
              name="sex"
              options={sexOptions}
              registration={form.register("sex")}
              required
            />
          </div>
          <CasePatientAgeFields controller={controller} />
        </div>
      </section>

      <section aria-label={t("sections.clinical.title")} className="border-t border-border pt-7">
        <CaseTextareaField
          {...notesRegistration}
          disabled={isCreating}
          error={form.formState.errors.clinicalNotes?.message}
          id="case-clinical-notes"
          label={t("fields.clinicalNotes")}
          maxLength={4000}
          placeholder={t("placeholders.clinicalNotes")}
          valueLength={clinicalNotes.length}
        />
      </section>
    </form>
  )
}

export { NewCaseForm }
