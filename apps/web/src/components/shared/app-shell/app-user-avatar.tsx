"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

type AppUserAvatarProps = {
  avatarUrl: string | null
  className?: string
  initials: string
}

function AppUserAvatar({ avatarUrl, className, initials }: AppUserAvatarProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null)

  if (avatarUrl && failedAvatarUrl !== avatarUrl) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={cn("shrink-0 rounded-[30%] border border-border object-cover", className)}
        onError={() => setFailedAvatarUrl(avatarUrl)}
        referrerPolicy="no-referrer"
        src={avatarUrl}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[30%] bg-brand-secondary font-medium text-brand-secondary-foreground",
        className,
      )}
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  )
}

export { AppUserAvatar }
export type { AppUserAvatarProps }
