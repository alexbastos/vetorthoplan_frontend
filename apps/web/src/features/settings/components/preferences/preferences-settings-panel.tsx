"use client"

import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef } from "react"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { Button } from "@/components/ui/button"
import { usePreferencesSettingsEntrance } from "../../hooks/animations/use-preferences-settings-entrance"
import type { ProfileSettingsController } from "../../hooks/use-profile-settings"
import type { ProfileValues } from "../../schemas/profile.schema"
import { LocaleSelectField } from "./locale-select-field"
import { ThemePreferenceField } from "./theme-preference-field"
import { TimeZoneSelectField } from "./time-zone-select-field"

type PreferencesSettingsPanelProps = {
  isActive: boolean
  profileSettings: ProfileSettingsController
}

function PreferencesSettingsPanel({ isActive, profileSettings }: PreferencesSettingsPanelProps) {
  const t = useTranslations("settings.preferences")
  const tActions = useTranslations("common.actions")
  const { form, isLoading, isSaving, loadError, onSubmit, retry } = profileSettings
  const { registerUnsavedChangesHandler } = useUnsavedChangesGuard()
  const panelRef = useRef<HTMLDivElement>(null)
  const dirtyFields = form.formState.dirtyFields
  const hasPreferenceUnsavedChanges = preferenceFields.some((field) => dirtyFields[field])
  const discardChanges = useCallback(() => {
    for (const field of preferenceFields) form.resetField(field)
  }, [form])
  const hasUnsavedChanges = useCallback(
    () => preferenceFields.some((field) => form.getFieldState(field).isDirty),
    [form],
  )
  const getUnsavedChanges = useCallback(() => getPreferenceUnsavedChanges(form.getValues(), form.formState.dirtyFields, form.formState.defaultValues ?? {}, (field) => t(field === "locale" ? "language" : "timezone")), [form, t])

  useEffect(() => {
    if (!isActive) return

    return registerUnsavedChangesHandler({ discardChanges, getUnsavedChanges, hasUnsavedChanges })
  }, [discardChanges, getUnsavedChanges, hasUnsavedChanges, isActive, registerUnsavedChangesHandler])

  useEffect(() => {
    if (!isActive || !hasPreferenceUnsavedChanges) return

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)

    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [hasPreferenceUnsavedChanges, isActive])

  usePreferencesSettingsEntrance(panelRef, isActive && !isLoading && !loadError)

  if (isLoading) return <PreferencesPanelSkeleton />

  if (loadError) {
    return (
      <div className="flex min-h-48 flex-col items-start justify-center gap-4 px-6 py-10 sm:px-8" role="alert">
        <p className="text-ui text-capta-text-secondary">{t("loadError")}</p>
        <Button onClick={() => retry()} size="sm" type="button" variant="secondary">
          <RefreshCw aria-hidden="true" />
          {tActions("retry")}
        </Button>
      </div>
    )
  }

  return (
    <div ref={panelRef} className="space-y-8 px-6 pt-4 pb-8 sm:px-8">
      <section aria-label={t("accountLabel")}>
        <div data-settings-preferences-group>
          <ThemePreferenceField />
        </div>
        <section aria-labelledby="language-region-preference-title" className="pt-5" data-settings-preferences-group>
          <h3 className="text-ui font-semibold text-capta-text-primary" id="language-region-preference-title">{t("languageRegion")}</h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <LocaleSelectField error={form.formState.errors.locale?.message} locale={form.watch("locale")} onValueChange={(locale) => form.setValue("locale", locale, { shouldDirty: true, shouldTouch: true, shouldValidate: true })} />
            <TimeZoneSelectField error={form.formState.errors.timezone?.message} onValueChange={(timezone) => form.setValue("timezone", timezone, { shouldDirty: true, shouldTouch: true, shouldValidate: true })} value={form.watch("timezone")} />
          </div>
        </section>
      </section>
      <div className="flex justify-end pt-6" data-settings-preferences-group>
        <Button disabled={!hasPreferenceUnsavedChanges || !form.formState.isValid} loading={isSaving} onClick={() => onSubmit()} type="button">{tActions("saveChanges")}</Button>
      </div>
    </div>
  )
}

type PreferenceField = "locale" | "timezone"

const preferenceFields: PreferenceField[] = ["locale", "timezone"]

function getPreferenceUnsavedChanges(
  values: ProfileValues,
  dirtyFields: Partial<Record<keyof ProfileValues, boolean>>,
  defaultValues: Partial<ProfileValues>,
  getLabel: (field: PreferenceField) => string,
) {
  return preferenceFields
    .filter((field) => dirtyFields[field])
    .map((field) => ({
      field,
      label: getLabel(field),
      previousValue: defaultValues[field] ?? "",
      value: values[field],
    }))
}

function PreferencesPanelSkeleton() {
  const t = useTranslations("settings.preferences")
  return (
    <div aria-busy="true" aria-label={t("loading")} className="space-y-4 px-6 py-8 sm:px-8">
      <div className="h-14 animate-pulse rounded bg-capta-surface-subtle" />
      <div className="h-14 animate-pulse rounded bg-capta-surface-subtle" />
    </div>
  )
}

export { PreferencesSettingsPanel }
