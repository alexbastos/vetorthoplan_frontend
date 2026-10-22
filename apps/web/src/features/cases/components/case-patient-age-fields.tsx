"use client"

import { CircleHelp } from "lucide-react"
import { useTranslations } from "next-intl"
import { Tooltip } from "radix-ui"
import { useState } from "react"
import { Controller, useWatch } from "react-hook-form"

import type { NewCaseFormController } from "../hooks/use-new-case-form"
import { ageMonthsAtDate, splitAgeMonths, utcDateOnly } from "../lib/case-age"
import { CaseAgeField, CaseDateField } from "./case-form-controls"

function CasePatientAgeFields({ controller }: { controller: NewCaseFormController }) {
  const t = useTranslations("cases.newCase")
  const { form, isCreating } = controller
  const birthDate = useWatch({ control: form.control, name: "birthDate" })
  const calculated = birthDate ? splitAgeMonths(ageMonthsAtDate(birthDate, utcDateOnly())) : null
  const readOnly = Boolean(birthDate)
  const helperId = "case-age-help"
  const [helpOpen, setHelpOpen] = useState(false)

  return <>
    <div className="sm:col-span-3">
      <Controller control={form.control} name="birthDate" render={({ field, fieldState }) => (
        <CaseDateField
          clearLabel={t("actions.clearBirthDate")}
          disabled={isCreating}
          error={fieldState.error?.message}
          id="case-birth-date"
          label={t("fields.birthDate")}
          onValueChange={(value) => {
            field.onChange(value)
            form.clearErrors(["ageYears", "ageMonths"])
            if (form.formState.isSubmitted) void form.trigger(["birthDate", "ageYears", "ageMonths"])
          }}
          placeholder={t("placeholders.birthDate")}
          value={field.value}
        />
      )} />
    </div>
    <fieldset aria-describedby={helperId} aria-labelledby="case-age-label" className="min-w-0 sm:col-span-3">
      <legend className="flex min-h-4 items-center gap-1.5 text-[length:var(--input-field-label-size)] leading-[var(--input-field-label-line-height)] font-semibold text-[var(--input-field-label-color)]">
        <span id="case-age-label">{t("fields.age")}</span>
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root onOpenChange={setHelpOpen} open={helpOpen}>
            <Tooltip.Trigger asChild>
              <button
                aria-label={t("ageHelp.label")}
                className="inline-flex size-4 items-center justify-center rounded-sm text-description hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onClick={(event) => { event.preventDefault(); setHelpOpen((open) => !open) }}
                type="button"
              ><CircleHelp aria-hidden="true" className="size-3.5" /></button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="z-50 max-w-[min(14rem,calc(100vw-2rem))] rounded-[var(--radius-token-md)] border border-border bg-card px-3 py-2 text-xs leading-relaxed font-normal text-foreground shadow-[var(--shadow-elevated)]"
                collisionPadding={16}
                side="top"
                sideOffset={6}
              >{t(readOnly ? "ageHelp.calculatedTooltip" : "ageHelp.declaredTooltip")}</Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </legend>
      <div className="mt-[var(--input-field-gap)] grid grid-cols-2 gap-3">
        {(["ageYears", "ageMonths"] as const).map((name) => <Controller key={name} control={form.control} name={name} render={({ field, fieldState }) => (
          <CaseAgeField
            decreaseLabel={t(name === "ageYears" ? "actions.decreaseAgeYears" : "actions.decreaseAge")}
            describedBy={helperId}
            disabled={isCreating}
            error={fieldState.error?.message}
            id={`case-${name}`}
            increaseLabel={t(name === "ageYears" ? "actions.increaseAgeYears" : "actions.increaseAge")}
            label={t(name === "ageYears" ? "fields.years" : "fields.months")}
            max={name === "ageYears" ? 50 : 11}
            name={field.name}
            onBlur={field.onBlur}
            onValueChange={(value) => {
              field.onChange(value)
              if (form.formState.isSubmitted) void form.trigger(["ageYears", "ageMonths"])
            }}
            placeholder={t(name === "ageYears" ? "placeholders.ageYears" : "placeholders.ageMonths")}
            readOnly={readOnly}
            ref={field.ref}
            value={readOnly ? (calculated ? String(name === "ageYears" ? calculated.years : calculated.months) : "") : field.value}
          />
        )} />)}
      </div>
      <p className="mt-2 text-caption text-description" id={helperId}>{t(readOnly ? "ageHelp.calculated" : "ageHelp.declared")}</p>
    </fieldset>
  </>
}

export { CasePatientAgeFields }
