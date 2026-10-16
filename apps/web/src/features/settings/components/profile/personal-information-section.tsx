"use client"

import { format } from "date-fns"
import { LockKeyhole, PencilLine } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useId } from "react"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import type { AppLocale } from "@/i18n/config"
import { getDateFnsLocale } from "@/i18n/date-fns-locale"
import { formatBrazilianPhone } from "@/lib/brazilian-input"
import { cn } from "@/lib/utils"

import type { ProfileSettingsController } from "../../hooks/use-profile-settings"
import { PROFILE_LINE_INPUT_CLASS_NAME, ProfileDisplayField, ProfileEditLine } from "./profile-account-field"
import { ProfileAvatarUpload } from "./profile-avatar-upload"

type PersonalInformationSectionProps = {
  isEditing: boolean
  onEdit: () => void
  profileSettings: ProfileSettingsController
  showValidationErrors: boolean
}

function PersonalInformationSection({ isEditing, onEdit, profileSettings, showValidationErrors }: PersonalInformationSectionProps) {
  const t = useTranslations("settings")
  const locale = useLocale()
  const fieldId = useId()
  const { deleteAvatar, form, isAvatarDeleting, isAvatarUploading, refreshAvatarUrl, uploadAvatar } = profileSettings
  const name = form.watch("name")
  const email = form.watch("email")
  const phone = form.watch("phone")
  const birthDate = form.watch("birthDate")
  const bio = form.watch("bio")
  const phoneRegistration = form.register("phone")
  const bioError = showValidationErrors ? form.formState.errors.bio?.message : undefined
  const birthDateError = showValidationErrors ? form.formState.errors.birthDate?.message : undefined
  const nameError = showValidationErrors ? form.formState.errors.name?.message : undefined
  const phoneError = showValidationErrors ? form.formState.errors.phone?.message : undefined

  return (
    <>
      <ProfileAvatarUpload
        email={email}
        isDeleting={isAvatarDeleting}
        isUploading={isAvatarUploading}
        name={name}
        onAvatarLoadError={refreshAvatarUrl}
        onDelete={deleteAvatar}
        onUpload={uploadAvatar}
        src={form.watch("avatarUrl")}
      />
      <input type="hidden" {...form.register("avatarUrl")} />

      <section
        aria-labelledby="profile-personal-data"
        className={cn("border-t border-border px-6 pt-6 sm:px-8 sm:pt-7", isEditing ? "pb-2 sm:pb-2" : "pb-6 sm:pb-7")}
        data-settings-profile-group
      >
        <div className="flex min-h-9 items-center justify-between gap-4">
          <h2 className="font-heading text-ui-semibold text-foreground" id="profile-personal-data">{t("profile.personalData")}</h2>
          {!isEditing ? (
            <Button onClick={onEdit} size="sm" type="button" variant="secondary">
              <PencilLine aria-hidden="true" />
              {t("profile.editPersonalInformation")}
            </Button>
          ) : null}
        </div>

        {isEditing ? (
          <div className="mt-2">
            <ProfileEditLine error={nameError} id={`${fieldId}-name`} label={t("fields.name")} required>
              <input
                {...form.register("name")}
                aria-describedby={nameError ? `${fieldId}-name-error` : undefined}
                aria-invalid={Boolean(nameError)}
                autoComplete="name"
                className={PROFILE_LINE_INPUT_CLASS_NAME}
                id={`${fieldId}-name`}
                placeholder={t("fields.namePlaceholder")}
              />
            </ProfileEditLine>

            <ProfileEditLine id={`${fieldId}-email`} label={t("fields.email")}>
              <div className="flex items-center gap-3">
                <input
                  {...form.register("email")}
                  aria-readonly="true"
                  autoComplete="email"
                  className={PROFILE_LINE_INPUT_CLASS_NAME}
                  id={`${fieldId}-email`}
                  readOnly
                  type="email"
                />
                <LockKeyhole aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </ProfileEditLine>

            <ProfileEditLine error={phoneError} id={`${fieldId}-phone`} label={t("fields.phone")}>
              <input
                aria-describedby={phoneError ? `${fieldId}-phone-error` : undefined}
                aria-invalid={Boolean(phoneError)}
                autoComplete="tel"
                className={PROFILE_LINE_INPUT_CLASS_NAME}
                id={`${fieldId}-phone`}
                inputMode="tel"
                name={phoneRegistration.name}
                onBlur={phoneRegistration.onBlur}
                onChange={(event) => {
                  event.currentTarget.value = formatBrazilianPhone(event.currentTarget.value)
                  void phoneRegistration.onChange(event)
                }}
                placeholder="(00) 00000-0000"
                ref={phoneRegistration.ref}
                type="tel"
              />
            </ProfileEditLine>

            <ProfileEditLine error={birthDateError} id={`${fieldId}-birth-date`} label={t("fields.birthDate")}>
              <div className="flex min-h-7 items-center">
                <DatePicker
                  aria-describedby={birthDateError ? `${fieldId}-birth-date-error` : undefined}
                  aria-invalid={Boolean(birthDateError)}
                  className="text-[0.75rem] font-normal text-description"
                  id={`${fieldId}-birth-date`}
                  onValueChange={(value) => form.setValue("birthDate", value, { shouldDirty: true, shouldValidate: true })}
                  value={birthDate}
                />
              </div>
            </ProfileEditLine>

            <ProfileEditLine error={bioError} id={`${fieldId}-bio`} label={t("fields.bio")} showDivider={false}>
              <div className="group/bio relative">
                <textarea
                  {...form.register("bio")}
                  aria-describedby={bioError ? `${fieldId}-bio-error` : undefined}
                  aria-invalid={Boolean(bioError)}
                  className={cn(
                    "h-7 w-full resize-none overflow-hidden rounded-[var(--input-radius)] border border-transparent bg-transparent px-0 py-1 text-[0.75rem] leading-5 text-description outline-none transition-[height,padding,border-color,background-color] duration-200 placeholder:text-[0.75rem] placeholder:text-[var(--input-placeholder)] focus:h-24 focus:overflow-auto focus:bg-[var(--input-surface-default)] focus:px-3 focus:pt-2 focus:pb-7 motion-reduce:transition-none",
                    bioError ? "focus:border-[var(--input-border-error)]" : "focus:border-[var(--input-border-default)]",
                  )}
                  id={`${fieldId}-bio`}
                  maxLength={500}
                  placeholder={t("fields.bioPlaceholder")}
                  rows={1}
                />
                <p aria-hidden="true" className="pointer-events-none absolute right-3 bottom-2 text-caption text-description opacity-0 transition-opacity duration-200 group-focus-within/bio:opacity-100 motion-reduce:transition-none">{bio.length}/500</p>
              </div>
            </ProfileEditLine>
          </div>
        ) : (
          <dl className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            <ProfileDisplayField label={t("fields.name")} value={name} />
            <ProfileDisplayField label={t("fields.email")} value={email} />
            <ProfileDisplayField label={t("fields.phone")} value={phone} />
            <ProfileDisplayField label={t("fields.birthDate")} value={formatProfileDate(birthDate, locale)} />
            <ProfileDisplayField className="sm:col-span-2" label={t("fields.bio")} value={bio} />
          </dl>
        )}
      </section>
    </>
  )
}

function formatProfileDate(value: string, locale: AppLocale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return ""

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) {
    return ""
  }

  return format(date, "P", { locale: getDateFnsLocale(locale) })
}

export { PersonalInformationSection }
