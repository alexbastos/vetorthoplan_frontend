"use client"

import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { useProfileSettingsEntrance } from "../../hooks/animations/use-profile-settings-entrance"
import { useProfileFormScope } from "../../hooks/use-profile-form-scope"
import type { ProfileSettingsController } from "../../hooks/use-profile-settings"
import { ADDRESS_PROFILE_FIELDS, PERSONAL_PROFILE_FIELDS, type ProfileAccountField } from "../../lib/profile-form-fields"
import { AddressSettingsSection } from "./address-settings-section"
import { PersonalInformationSection } from "./personal-information-section"

type ProfileSettingsPanelProps = {
  isActive: boolean
  profileSettings: ProfileSettingsController
  scope: "address" | "personal"
}

function ProfileSettingsPanel({ isActive, profileSettings, scope }: ProfileSettingsPanelProps) {
  const t = useTranslations("settings")
  const tActions = useTranslations("common.actions")
  const { form, isLoading, isSaving, loadError, retry, saveProfile } = profileSettings
  const formRef = useRef<HTMLFormElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)
  const fields: readonly ProfileAccountField[] = scope === "personal" ? PERSONAL_PROFILE_FIELDS : ADDRESS_PROFILE_FIELDS
  const getFieldLabel = useCallback((field: ProfileAccountField) => t(`fields.${field}`), [t])
  const closeEditor = useCallback(() => {
    setIsEditing(false)
    setHasAttemptedSave(false)
  }, [])

  useProfileSettingsEntrance(formRef, isActive && !isLoading && !loadError)
  const { discardChanges, hasUnsavedChanges } = useProfileFormScope({
    fields,
    form,
    getLabel: getFieldLabel,
    isActive,
    onDiscardChanges: closeEditor,
  })

  useEffect(() => {
    if (!isActive) closeEditor()
  }, [closeEditor, isActive])

  if (isLoading) {
    return <ProfilePanelSkeleton scope={scope} />
  }

  if (loadError) {
    return (
      <div className="flex min-h-48 flex-col items-start justify-center gap-4 px-6 py-10 sm:px-8" role="alert">
        <div className="space-y-1">
          <h3 className="text-ui-semibold text-foreground">{t("profile.loadError")}</h3>
          <p className="text-ui text-content-secondary">{loadError}</p>
        </div>
        <Button onClick={() => retry()} size="sm" type="button" variant="secondary">
          <RefreshCw aria-hidden="true" />
          {tActions("retry")}
        </Button>
      </div>
    )
  }

  const handleScopedSubmit = form.handleSubmit(async (values) => {
    if (await saveProfile(values)) closeEditor()
  }, () => {
    setHasAttemptedSave(true)
  })

  function beginEditing() {
    setHasAttemptedSave(false)
    setIsEditing(true)
    requestAnimationFrame(() => form.setFocus(scope === "personal" ? "name" : "zipCode"))
  }

  return (
    <form
      ref={formRef}
      className=""
      noValidate
      onSubmit={handleScopedSubmit}
    >
      {scope === "personal" ? (
        <>
          <PersonalInformationSection isEditing={isEditing} onEdit={beginEditing} profileSettings={profileSettings} showValidationErrors={hasAttemptedSave} />
          {isEditing ? (
            <div className="flex flex-col-reverse gap-3 px-6 pt-2 pb-5 sm:flex-row sm:justify-end sm:px-8" data-settings-profile-group>
              <Button disabled={isSaving} onClick={discardChanges} type="button" variant="secondary">{tActions("cancel")}</Button>
              <Button disabled={!hasUnsavedChanges} loading={isSaving} type="submit">{tActions("saveChanges")}</Button>
            </div>
          ) : null}
        </>
      ) : (
        <AddressSettingsSection
          hasUnsavedChanges={hasUnsavedChanges}
          isEditing={isEditing}
          onCancel={discardChanges}
          onEdit={beginEditing}
          onValidationAttempt={() => setHasAttemptedSave(true)}
          profileSettings={profileSettings}
          showValidationErrors={hasAttemptedSave}
        />
      )}
    </form>
  )
}

function ProfilePanelSkeleton({ scope }: { scope: ProfileSettingsPanelProps["scope"] }) {
  const t = useTranslations("settings.profile")

  if (scope === "address") {
    return (
      <div aria-busy="true" aria-label={t("loading")} className="px-6 py-7 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div className={index === 2 ? "space-y-2 sm:col-span-2" : "space-y-2"} key={index}>
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <div className="flex items-center gap-4 px-6 py-6 sm:px-8">
        <div className="size-16 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="h-3 w-52 max-w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="hidden h-9 w-28 animate-pulse rounded-md bg-muted sm:block" />
      </div>
      <div className="space-y-6 border-t border-border px-6 py-7 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="space-y-2" key={index}>
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

export { ProfileSettingsPanel }
