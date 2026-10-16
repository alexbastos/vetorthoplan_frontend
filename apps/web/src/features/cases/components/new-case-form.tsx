"use client"

import { useTranslations } from "next-intl"
import type { KeyboardEvent } from "react"
import { Controller, useWatch } from "react-hook-form"

import { InputField } from "@/components/ui/input-field"

import type { NewCaseFormController } from "../hooks/use-new-case-form"
import { sanitizeUnsignedDecimal } from "../lib/numeric-input"
import { CaseAgeField, CaseDateField, CaseRadioField, CaseTextareaField } from "./case-form-controls"

type NewCaseFormProps = {
  controller: NewCaseFormController
}

function NewCaseForm({ controller }: NewCaseFormProps) {
  const t = useTranslations("cases.newCase")
  const { form, isContinuing, onSubmit } = controller
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
          disabled={isContinuing}
          error={form.formState.errors.title?.message}
          label={t("fields.title")}
          maxLength={160}
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
              disabled={isContinuing}
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
              disabled={isContinuing}
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
              disabled={isContinuing}
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
                  disabled={isContinuing}
                  error={fieldState.error?.message}
                  inputMode="decimal"
                  label={t("fields.weightKg")}
                  onChange={(event) => {
                    const value = sanitizeUnsignedDecimal(event.target.value)
                    event.target.value = value
                    field.onChange(value)
                  }}
                  onKeyDown={preventNonDecimalKey}
                  pattern="[0-9]*[.,]?[0-9]{0,2}"
                  placeholder={t("placeholders.weightKg")}
                  type="text"
                />
              )}
            />
          </div>

          <div className="sm:col-span-3">
            <CaseRadioField
              disabled={isContinuing}
              error={form.formState.errors.sex?.message}
              label={t("fields.sex")}
              name="sex"
              options={sexOptions}
              registration={form.register("sex")}
              required
            />
          </div>
          <div className="sm:col-span-3">
            <Controller
              control={form.control}
              name="birthDate"
              render={({ field, fieldState }) => (
                <CaseDateField
                  disabled={isContinuing}
                  error={fieldState.error?.message}
                  id="case-birth-date"
                  label={t("fields.birthDate")}
                  onValueChange={(value) => {
                    field.onChange(value)
                    if (value && form.getValues("ageYears")) {
                      form.setValue("ageYears", "", { shouldDirty: true, shouldValidate: true })
                    }
                  }}
                  placeholder={t("placeholders.birthDate")}
                  value={field.value}
                />
              )}
            />
          </div>

          <div className="sm:col-span-3">
            <Controller
              control={form.control}
              name="ageYears"
              render={({ field, fieldState }) => (
                <CaseAgeField
                  decreaseLabel={t("actions.decreaseAge")}
                  disabled={isContinuing}
                  error={fieldState.error?.message}
                  id="case-age-years"
                  increaseLabel={t("actions.increaseAge")}
                  label={t("fields.ageYears")}
                  name={field.name}
                  onBlur={field.onBlur}
                  onKeyDown={preventNonIntegerKey}
                  onValueChange={(value) => {
                    field.onChange(value)
                    if (value && form.getValues("birthDate")) {
                      form.setValue("birthDate", "", { shouldDirty: true, shouldValidate: true })
                    }
                  }}
                  placeholder={t("placeholders.ageYears")}
                  ref={field.ref}
                  value={field.value}
                />
              )}
            />
          </div>
        </div>
      </section>

      <section aria-label={t("sections.clinical.title")} className="border-t border-border pt-7">
        <CaseTextareaField
          {...notesRegistration}
          disabled={isContinuing}
          error={form.formState.errors.clinicalNotes?.message}
          id="case-clinical-notes"
          label={t("fields.clinicalNotes")}
          maxLength={1000}
          placeholder={t("placeholders.clinicalNotes")}
          valueLength={clinicalNotes.length}
        />
      </section>
    </form>
  )
}

const EDITING_KEYS = new Set(["ArrowLeft", "ArrowRight", "Backspace", "Delete", "End", "Enter", "Escape", "Home", "Tab"])

function preventNonIntegerKey(event: KeyboardEvent<HTMLInputElement>) {
  if (isEditingShortcut(event) || /^\d$/.test(event.key)) return
  event.preventDefault()
}

function preventNonDecimalKey(event: KeyboardEvent<HTMLInputElement>) {
  if (isEditingShortcut(event) || /^\d$/.test(event.key) || event.key === "," || event.key === ".") return
  event.preventDefault()
}

function isEditingShortcut(event: KeyboardEvent<HTMLInputElement>): boolean {
  return event.ctrlKey || event.metaKey || event.altKey || EDITING_KEYS.has(event.key)
}

export { NewCaseForm }
