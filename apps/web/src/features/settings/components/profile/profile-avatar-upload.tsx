"use client"

import { ImageUp, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { type ChangeEvent, useEffect, useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AVATAR_ACCEPT_ATTRIBUTE, validateAvatarFile, type AvatarFileValidationError } from "../../lib/avatar-file-policy"
import { ProfileAvatar } from "./profile-avatar"

type ProfileAvatarUploadProps = {
  email: string
  isDeleting: boolean
  isUploading: boolean
  name: string
  onAvatarLoadError: (failedSrc: string) => Promise<void>
  onDelete: () => Promise<boolean>
  onUpload: (avatar: File) => Promise<boolean>
  src: string
}

export function ProfileAvatarUpload({ email, isDeleting, isUploading, name, onAvatarLoadError, onDelete, onUpload, src }: ProfileAvatarUploadProps) {
  const t = useTranslations("settings.profile")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const descriptionId = "profile-avatar-description"
  const errorId = "profile-avatar-error"

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    const validation = await validateAvatarFile(file)

    if (!validation.ok) {
      setError(t(getAvatarValidationMessageKey(validation.error)))
      input.value = ""
      return
    }

    setError(null)
    setPreviewUrl(URL.createObjectURL(file))

    try {
      await onUpload(file)
    } finally {
      setPreviewUrl(null)
      input.value = ""
    }
  }

  async function handleDelete() {
    const deleted = await onDelete()
    if (deleted) setPreviewUrl(null)
  }

  return (
    <div aria-busy={isDeleting || isUploading} className="px-6 py-5 sm:px-8 sm:py-6" data-settings-profile-group>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="group/avatar relative shrink-0">
            <ProfileAvatar name={name} onLoadError={previewUrl ? undefined : onAvatarLoadError} src={previewUrl ?? src} />
            {src ? (
              <Button
                aria-label={t("removePhoto")}
                className="absolute inset-0 size-16 rounded-full border-0 bg-black/55 p-0 text-white opacity-0 transition-opacity hover:bg-black/65 focus-visible:opacity-100 group-hover/avatar:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
                disabled={isDeleting || isUploading}
                loading={isDeleting}
                onClick={handleDelete}
                size="sm"
                title={t("removePhoto")}
                type="button"
                variant="ghost"
              >
                {!isDeleting ? <Trash2 aria-hidden="true" className="size-4" /> : null}
              </Button>
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="truncate text-ui-semibold text-foreground">{name || t("notProvided")}</p>
            <p className="mt-0.5 truncate text-ui text-description">{email}</p>
          </div>
        </div>

        <div className="min-w-0 sm:text-right">
          <label className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "focus-within:ring-[var(--button-focus-weight)] focus-within:ring-[var(--button-focus-color)] has-disabled:pointer-events-none has-disabled:opacity-50")}>
            <ImageUp aria-hidden="true" className="size-4" />
            <input
              accept={AVATAR_ACCEPT_ATTRIBUTE}
              aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
              aria-invalid={Boolean(error)}
              className="sr-only"
              disabled={isDeleting || isUploading}
              onChange={handleFileChange}
              type="file"
            />
            {isUploading ? t("savingPhoto") : t("changePhoto")}
          </label>
          <p className="mt-2 text-caption text-description" id={descriptionId}>{t("avatarHint")}</p>
        </div>
      </div>
      {previewUrl ? <p className="mt-3 text-caption text-description sm:text-right" role="status">{t("avatarPreview")}</p> : null}
      {error ? <p className="mt-3 text-caption text-[var(--color-feedback-error)] sm:text-right" id={errorId} role="alert">{error}</p> : null}
    </div>
  )
}

function getAvatarValidationMessageKey(error: AvatarFileValidationError) {
  switch (error) {
    case "empty":
      return "avatarEmptyError" as const
    case "too-large":
      return "avatarSizeError" as const
    case "unsupported-type":
      return "avatarTypeError" as const
    case "invalid-content":
      return "avatarContentError" as const
  }
}
