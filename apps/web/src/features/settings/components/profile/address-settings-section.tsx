"use client"

import { PencilLine } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId } from "react"

import { Button } from "@/components/ui/button"
import { formatBrazilianPostalCode, onlyDigits } from "@/lib/brazilian-input"
import { cn } from "@/lib/utils"

import { usePostalCodeLookup } from "../../hooks/use-postal-code-lookup"
import type { ProfileSettingsController } from "../../hooks/use-profile-settings"
import { useSettingsErrorMessage } from "../../hooks/use-settings-error-message"
import { PROFILE_LINE_INPUT_CLASS_NAME, ProfileDisplayField, ProfileEditLine } from "./profile-account-field"

type AddressSettingsSectionProps = {
  hasUnsavedChanges: boolean
  isEditing: boolean
  onCancel: () => void
  onEdit: () => void
  onValidationAttempt: () => void
  profileSettings: ProfileSettingsController
  showValidationErrors: boolean
}

function AddressSettingsSection({ hasUnsavedChanges, isEditing, onCancel, onEdit, onValidationAttempt, profileSettings, showValidationErrors }: AddressSettingsSectionProps) {
  const t = useTranslations("settings")
  const tActions = useTranslations("common.actions")
  const fieldId = useId()
  const { form, isSaving } = profileSettings
  const getSettingsErrorMessage = useSettingsErrorMessage()
  const postalCodeLookup = usePostalCodeLookup(form)
  const zipCode = form.watch("zipCode")
  const street = form.watch("street")
  const city = form.watch("city")
  const state = form.watch("state")
  const country = form.watch("country")
  const postalCodeRegistration = form.register("zipCode")
  const postalCodeDigitCount = onlyDigits(zipCode).length
  const postalCodeError = showValidationErrors
    ? postalCodeLookup.status === "invalid"
      ? postalCodeLookup.message
      : form.formState.errors.zipCode?.message ?? (postalCodeDigitCount > 0 && postalCodeDigitCount < 8
        ? getSettingsErrorMessage("INVALID_POSTAL_CODE")
        : undefined)
    : undefined
  const postalCodeDescription = postalCodeLookup.status === "loading" || postalCodeLookup.status === "unavailable"
    ? postalCodeLookup.message
    : undefined
  const streetError = showValidationErrors ? form.formState.errors.street?.message : undefined
  const cityError = showValidationErrors ? form.formState.errors.city?.message : undefined
  const stateError = showValidationErrors ? form.formState.errors.state?.message : undefined
  const countryError = showValidationErrors ? form.formState.errors.country?.message : undefined

  return (
    <>
      <section
        aria-labelledby="profile-address-data"
        className={cn("px-6 pt-6 sm:px-8 sm:pt-7", isEditing ? "pb-2 sm:pb-2" : "pb-6 sm:pb-7")}
        data-settings-profile-group
      >
        <div className="flex min-h-9 items-center justify-between gap-4">
          <h2 className="font-heading text-ui-semibold text-foreground" id="profile-address-data">{t("profile.addressData")}</h2>
          {!isEditing ? (
            <Button onClick={onEdit} size="sm" type="button" variant="secondary">
              <PencilLine aria-hidden="true" />
              {t("profile.editPersonalInformation")}
            </Button>
          ) : null}
        </div>

        {isEditing ? (
          <div className="mt-2">
            <ProfileEditLine description={postalCodeDescription} error={postalCodeError} id={fieldId + "-zip-code"} label={t("fields.zipCode")}>
              <input
                aria-describedby={postalCodeError ? fieldId + "-zip-code-error" : postalCodeDescription ? fieldId + "-zip-code-description" : undefined}
                aria-invalid={Boolean(postalCodeError)}
                autoComplete="postal-code"
                className={PROFILE_LINE_INPUT_CLASS_NAME}
                id={fieldId + "-zip-code"}
                inputMode="numeric"
                name={postalCodeRegistration.name}
                onBlur={postalCodeRegistration.onBlur}
                onChange={(event) => {
                  event.currentTarget.value = formatBrazilianPostalCode(event.currentTarget.value)
                  const value = event.currentTarget.value
                  void postalCodeRegistration.onChange(event)
                  postalCodeLookup.onPostalCodeChange(value)
                }}
                placeholder="00000-000"
                ref={postalCodeRegistration.ref}
              />
            </ProfileEditLine>

            <ProfileEditLine error={streetError} id={fieldId + "-street"} label={t("fields.street")}>
              <input {...form.register("street")} aria-describedby={streetError ? fieldId + "-street-error" : undefined} aria-invalid={Boolean(streetError)} autoComplete="street-address" className={PROFILE_LINE_INPUT_CLASS_NAME} id={fieldId + "-street"} placeholder={t("fields.streetPlaceholder")} />
            </ProfileEditLine>

            <ProfileEditLine error={cityError} id={fieldId + "-city"} label={t("fields.city")}>
              <input {...form.register("city")} aria-describedby={cityError ? fieldId + "-city-error" : undefined} aria-invalid={Boolean(cityError)} autoComplete="address-level2" className={PROFILE_LINE_INPUT_CLASS_NAME} id={fieldId + "-city"} placeholder={t("fields.cityPlaceholder")} />
            </ProfileEditLine>

            <ProfileEditLine error={stateError} id={fieldId + "-state"} label={t("fields.state")}>
              <input {...form.register("state")} aria-describedby={stateError ? fieldId + "-state-error" : undefined} aria-invalid={Boolean(stateError)} autoComplete="address-level1" className={PROFILE_LINE_INPUT_CLASS_NAME} id={fieldId + "-state"} placeholder={t("fields.statePlaceholder")} />
            </ProfileEditLine>

            <ProfileEditLine error={countryError} id={fieldId + "-country"} label={t("fields.country")}>
              <input {...form.register("country")} aria-describedby={countryError ? fieldId + "-country-error" : undefined} aria-invalid={Boolean(countryError)} autoComplete="country" className={PROFILE_LINE_INPUT_CLASS_NAME} id={fieldId + "-country"} placeholder="BR" />
            </ProfileEditLine>
          </div>
        ) : (
          <dl className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            <ProfileDisplayField label={t("fields.zipCode")} value={zipCode} />
            <ProfileDisplayField label={t("fields.country")} value={country} />
            <ProfileDisplayField label={t("fields.street")} value={street} />
            <ProfileDisplayField label={t("fields.state")} value={state} />
            <ProfileDisplayField label={t("fields.city")} value={city} />
          </dl>
        )}
      </section>

      {isEditing ? (
        <div className="flex flex-col-reverse gap-3 px-6 pt-2 pb-5 sm:flex-row sm:justify-end sm:px-8" data-settings-profile-group>
          <Button disabled={isSaving} onClick={onCancel} type="button" variant="secondary">{tActions("cancel")}</Button>
          <Button
            disabled={!hasUnsavedChanges || postalCodeLookup.status === "loading" || (showValidationErrors && postalCodeLookup.status === "invalid")}
            loading={isSaving}
            onClick={(event) => {
              if (postalCodeLookup.status !== "invalid") return
              event.preventDefault()
              onValidationAttempt()
            }}
            type="submit"
          >
            {tActions("saveChanges")}
          </Button>
        </div>
      ) : null}
    </>
  )
}

export { AddressSettingsSection }
