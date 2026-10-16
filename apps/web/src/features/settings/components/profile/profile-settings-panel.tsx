"use client"

import { RefreshCw } from "lucide-react"
import { useCallback, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { formatBrazilianPhone, formatBrazilianPostalCode, onlyDigits } from "@/lib/brazilian-input"
import { useProfileSettingsEntrance } from "../../hooks/animations/use-profile-settings-entrance"
import { usePostalCodeLookup } from "../../hooks/use-postal-code-lookup"
import type { ProfileSettingsController } from "../../hooks/use-profile-settings"
import { useSettingsErrorMessage } from "../../hooks/use-settings-error-message"
import type { ProfileValues } from "../../schemas/profile.schema"
import { ProfileAvatarUpload } from "./profile-avatar-upload"
import { ProfileDateRow, ProfileFormRow, ProfileTextAreaRow } from "./profile-form-row"

type ProfileSettingsPanelProps = {
  isActive: boolean
  profileSettings: ProfileSettingsController
}

function ProfileSettingsPanel({ isActive, profileSettings }: ProfileSettingsPanelProps) {
  const t = useTranslations("settings")
  const tActions = useTranslations("common.actions")
  const { deleteAvatar, form, isAvatarDeleting, isAvatarUploading, isLoading, isSaving, loadError, onSubmit, refreshAvatarUrl, retry, uploadAvatar } = profileSettings
  const getSettingsErrorMessage = useSettingsErrorMessage()
  const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
  const postalCodeLookup = usePostalCodeLookup(form)
  const formRef = useRef<HTMLFormElement>(null)
  const dirtyFields = form.formState.dirtyFields
  const hasProfileUnsavedChanges = profileFields.some((field) => dirtyFields[field])
  const postalCodeDigitCount = onlyDigits(form.watch("zipCode")).length
  const postalCodeError = postalCodeLookup.status === "invalid"
    ? postalCodeLookup.message
    : form.formState.isSubmitted && postalCodeDigitCount > 0 && postalCodeDigitCount < 8
      ? getSettingsErrorMessage("INVALID_POSTAL_CODE")
      : undefined

  useProfileSettingsEntrance(formRef, !isLoading && !loadError)

  const discardChanges = useCallback(() => {
    for (const field of profileFields) form.resetField(field)
  }, [form])
  const hasUnsavedChanges = useCallback(
    () => profileFields.some((field) => form.getFieldState(field).isDirty),
    [form],
  )
  const getUnsavedChanges = useCallback(() => getProfileUnsavedChanges(form.getValues(), form.formState.dirtyFields, form.formState.defaultValues ?? {}, (field) => t(`fields.${field}`)), [form, t])

  useEffect(() => {
    if (!isActive) return

    return registerUnsavedChangesHandler({ discardChanges, getUnsavedChanges, hasUnsavedChanges })
  }, [discardChanges, getUnsavedChanges, hasUnsavedChanges, isActive, registerUnsavedChangesHandler])

  useEffect(() => {
    if (!isActive || !hasProfileUnsavedChanges) {
      return
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)

    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [hasProfileUnsavedChanges, isActive])

  if (isLoading) {
    return <ProfilePanelSkeleton />
  }

  if (loadError) {
    return (
      <div className="flex min-h-48 flex-col items-start justify-center gap-4 px-6 py-10 sm:px-8" role="alert">
        <div className="space-y-1">
          <h3 className="text-ui-semibold text-capta-text-primary">{t("profile.loadError")}</h3>
          <p className="text-ui text-capta-text-secondary">{loadError}</p>
        </div>
        <Button onClick={() => retry()} size="sm" type="button" variant="secondary">
          <RefreshCw aria-hidden="true" />
          {tActions("retry")}
        </Button>
      </div>
    )
  }

  return (
    <form ref={formRef} className="space-y-8 px-6 pt-4 pb-8 sm:px-8" noValidate onSubmit={onSubmit}>
      <section aria-labelledby="profile-personal-information" className="space-y-4" data-settings-profile-group>
        <h3 className="text-ui-semibold text-capta-text-primary" id="profile-personal-information">
          {t("profile.personalInformation")}
        </h3>

        <ProfileAvatarUpload
          isDeleting={isAvatarDeleting}
          isUploading={isAvatarUploading}
          name={form.watch("name")}
          onAvatarLoadError={refreshAvatarUrl}
          onDelete={deleteAvatar}
          onUpload={uploadAvatar}
          src={form.watch("avatarUrl")}
        />
        <input type="hidden" {...form.register("avatarUrl")} />

        <ProfileFormRow autoComplete="name" error={form.formState.errors.name?.message} label={t("fields.name")} placeholder={t("fields.namePlaceholder")} registration={form.register("name")} required />
        <ProfileFormRow autoComplete="email" editable={false} error={form.formState.errors.email?.message} label={t("fields.email")} placeholder={t("fields.emailPlaceholder")} registration={form.register("email")} required type="email" />
        <ProfileFormRow
          autoComplete="tel"
          error={form.formState.errors.phone?.message}
          formatValue={formatBrazilianPhone}
          inputMode="tel"
          label={t("fields.phone")}
          placeholder="(00) 00000-0000"
          registration={form.register("phone")}
          type="tel"
        />
        <ProfileDateRow
          error={form.formState.errors.birthDate?.message}
          label={t("fields.birthDate")}
          onValueChange={(value) => form.setValue("birthDate", value, { shouldDirty: true, shouldValidate: true })}
          value={form.watch("birthDate")}
        />
        <ProfileTextAreaRow
          error={form.formState.errors.bio?.message}
          onValueChange={(value) => form.setValue("bio", value, { shouldDirty: true, shouldValidate: true })}
          value={form.watch("bio")}
        />
      </section>

      <section aria-labelledby="profile-location" className="space-y-4" data-settings-profile-group>
        <div>
          <h3 className="text-ui-semibold text-capta-text-primary" id="profile-location">{t("profile.location")}</h3>
          <p className="mt-1 text-ui text-capta-text-secondary">{t("profile.locationDescription")}</p>
        </div>

        <ProfileFormRow
          autoComplete="postal-code"
          description={postalCodeLookup.message}
          error={postalCodeError}
          formatValue={formatBrazilianPostalCode}
          inputMode="numeric"
          label={t("fields.zipCode")}
          onValueChange={postalCodeLookup.onPostalCodeChange}
          placeholder="00000-000"
          registration={form.register("zipCode")}
        />
        <ProfileFormRow autoComplete="street-address" error={form.formState.errors.street?.message} label={t("fields.street")} placeholder={t("fields.streetPlaceholder")} registration={form.register("street")} />
        <ProfileFormRow autoComplete="address-level2" error={form.formState.errors.city?.message} label={t("fields.city")} placeholder={t("fields.cityPlaceholder")} registration={form.register("city")} />
        <ProfileFormRow autoComplete="address-level1" error={form.formState.errors.state?.message} label={t("fields.state")} placeholder={t("fields.statePlaceholder")} registration={form.register("state")} />
        <ProfileFormRow autoComplete="country" error={form.formState.errors.country?.message} label={t("fields.country")} placeholder="BR" registration={form.register("country")} />
      </section>

      <div className="flex justify-end pt-6" data-settings-profile-group>
        <Button
          disabled={postalCodeLookup.status === "invalid" || postalCodeLookup.status === "loading" || Boolean(postalCodeError)}
          loading={isSaving}
          type="submit"
        >
          {tActions("saveChanges")}
        </Button>
      </div>
    </form>
  )
}

type ProfileDisplayField = "bio" | "birthDate" | "city" | "country" | "name" | "phone" | "state" | "street" | "zipCode"

const profileFields: ProfileDisplayField[] = ["bio", "birthDate", "city", "country", "name", "phone", "state", "street", "zipCode"]

function getProfileUnsavedChanges(
  values: ProfileValues,
  dirtyFields: Partial<Record<keyof ProfileValues, boolean>>,
  defaultValues: Partial<ProfileValues>,
  getLabel: (field: ProfileDisplayField) => string,
) {
  return profileFields
    .filter((field) => dirtyFields[field])
    .map((field) => ({ field, label: getLabel(field), previousValue: defaultValues[field] ?? "", value: values[field] }))
}

function ProfilePanelSkeleton() {
  const t = useTranslations("settings.profile")
  return (
    <div aria-busy="true" aria-label={t("loading")} className="space-y-6 px-6 py-8 sm:px-8">
      <div className="h-5 w-40 animate-pulse rounded bg-capta-surface-subtle" />
      <div className="h-24 animate-pulse rounded-[var(--radius-token-lg)] bg-capta-surface-subtle" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-16 animate-pulse rounded-[var(--radius-token-lg)] bg-capta-surface-subtle" />
        <div className="h-16 animate-pulse rounded-[var(--radius-token-lg)] bg-capta-surface-subtle" />
      </div>
      <div className="h-28 animate-pulse rounded-[var(--radius-token-lg)] bg-capta-surface-subtle" />
    </div>
  )
}

export { ProfileSettingsPanel }
