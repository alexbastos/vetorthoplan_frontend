"use client"

import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { type ChangeEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { AVATAR_ACCEPT_ATTRIBUTE, validateAvatarFile, type AvatarFileValidationError } from "../../lib/avatar-file-policy"
import { ProfileAvatar } from "./profile-avatar"

type ProfileAvatarUploadProps = {
  isDeleting: boolean
  isUploading: boolean
  name: string
  onAvatarLoadError: (failedSrc: string) => Promise<void>
  onDelete: () => Promise<boolean>
  onUpload: (avatar: File) => Promise<boolean>
  src: string
}

export function ProfileAvatarUpload({ isDeleting, isUploading, name, onAvatarLoadError, onDelete, onUpload, src }: ProfileAvatarUploadProps) {
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
    <div aria-busy={isDeleting || isUploading} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
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
        <div className="flex flex-wrap items-center gap-2">
          <label className="motion-interactive inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-capta-border bg-transparent px-3 text-ui font-medium text-capta-text-primary hover:bg-capta-surface-muted focus-within:bg-capta-surface-subtle focus-within:outline-none has-disabled:pointer-events-none has-disabled:opacity-50">
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
        </div>
        <p className="mt-2 text-caption text-capta-text-secondary" id={descriptionId}>{t("avatarHint")}</p>
        {previewUrl ? <p className="mt-2 text-caption text-capta-text-secondary" role="status">{t("avatarPreview")}</p> : null}
        {error ? <p className="mt-2 text-caption text-[var(--color-feedback-error)]" id={errorId} role="alert">{error}</p> : null}
      </div>
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
