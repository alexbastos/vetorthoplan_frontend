"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"

type ProfileAvatarProps = {
  name: string
  onLoadError?: (failedSrc: string) => Promise<void> | void
  src: string
}

function ProfileAvatar({ name, onLoadError, src }: ProfileAvatarProps) {
  const t = useTranslations("settings.profile")
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const refreshAttemptedRef = useRef(false)
  const imageFailed = failedSrc === src

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()

  if (src && !imageFailed) {
    return (
      <img
        alt={t("avatarAlt")}
        className="size-16 rounded-full border border-border object-cover"
        onLoad={() => {
          refreshAttemptedRef.current = false
        }}
        onError={() => {
          setFailedSrc(src)

          if (onLoadError && !refreshAttemptedRef.current) {
            refreshAttemptedRef.current = true
            void onLoadError(src)
          }
        }}
        src={src}
      />
    )
  }

  return <span aria-label={t("avatarUnavailable")} className="flex size-16 items-center justify-center rounded-full bg-[var(--profile-avatar-surface)] text-ui-semibold text-brand-secondary-foreground">{initials || "U"}</span>
}

export { ProfileAvatar }
