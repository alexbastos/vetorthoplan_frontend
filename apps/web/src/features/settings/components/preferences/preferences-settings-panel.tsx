"use client"

import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useRef } from "react"

import { Button } from "@/components/ui/button"
import { usePreferencesSettingsEntrance } from "../../hooks/animations/use-preferences-settings-entrance"
import { useProfileFormScope } from "../../hooks/use-profile-form-scope"
import type { ProfileSettingsController } from "../../hooks/use-profile-settings"
import { PREFERENCE_PROFILE_FIELDS } from "../../lib/profile-form-fields"
import { LocaleSelectField } from "./locale-select-field"
import { TimeZoneSelectField } from "./time-zone-select-field"

type PreferencesSettingsPanelProps = {
  isActive: boolean
  profileSettings: ProfileSettingsController
}

function PreferencesSettingsPanel({ isActive, profileSettings }: PreferencesSettingsPanelProps) {
  const t = useTranslations("settings.preferences")
  const tActions = useTranslations("common.actions")
  const { form, isLoading, isSaving, loadError, onSubmit, retry } = profileSettings
  const panelRef = useRef<HTMLDivElement>(null)
  const getFieldLabel = useCallback((field: (typeof PREFERENCE_PROFILE_FIELDS)[number]) => t(field === "locale" ? "language" : "timezone"), [t])
  const { hasUnsavedChanges: hasPreferenceUnsavedChanges } = useProfileFormScope({
    fields: PREFERENCE_PROFILE_FIELDS,
    form,
    getLabel: getFieldLabel,
    isActive,
  })

  usePreferencesSettingsEntrance(panelRef, isActive && !isLoading && !loadError)

  if (isLoading) return <PreferencesPanelSkeleton />

  if (loadError) {
    return (
      <div className="flex min-h-48 flex-col items-start justify-center gap-4 px-6 py-10 sm:px-8" role="alert">
        <p className="text-ui text-content-secondary">{t("loadError")}</p>
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
        <section aria-labelledby="language-region-preference-title" className="pt-5" data-settings-preferences-group>
          <h3 className="text-ui font-semibold text-foreground" id="language-region-preference-title">{t("languageRegion")}</h3>
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

function PreferencesPanelSkeleton() {
  const t = useTranslations("settings.preferences")
  return (
    <div aria-busy="true" aria-label={t("loading")} className="space-y-4 px-6 py-8 sm:px-8">
      <div className="h-14 animate-pulse rounded bg-muted" />
      <div className="h-14 animate-pulse rounded bg-muted" />
    </div>
  )
}

export { PreferencesSettingsPanel }
