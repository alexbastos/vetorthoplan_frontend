"use client"

import { ChevronDown, Search } from "lucide-react"
import { forwardRef, type ComponentProps } from "react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

import { AppNotificationsMenu } from "./app-notifications-menu"
import { AppUserAvatar } from "./app-user-avatar"
import type { HeaderAppProps } from "./types"

function HeaderApp({ actions, context, navigation, notifications, profile }: HeaderAppProps) {
  const t = useTranslations("common.header")
  return (
    <header className="flex h-[var(--layout-header-height)] items-center justify-between gap-3 bg-sidebar px-4 sm:gap-6 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {navigation ? <span className="shrink-0 lg:hidden">{navigation}</span> : null}
        <p className="min-w-0 truncate font-mono text-[0.8125rem] font-medium tracking-[0.06em] text-foreground">
          <span aria-hidden="true" className="mr-2 text-muted-foreground">/</span>
          {context.toUpperCase()}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <GlobalSearch />
        <div id="app-header-actions" aria-label={t("pageActions")} className="hidden items-center gap-2 empty:hidden sm:flex">
          {actions}
        </div>
        {notifications ?? <AppNotificationsMenu />}
        {profile ?? <HeaderProfileIndicator />}
      </div>
    </header>
  )
}

function GlobalSearch() {
  const t = useTranslations("common.header")
  return (
    <label className="motion-interactive hidden h-9 w-60 items-center gap-2 rounded-full bg-search px-3.5 outline-none focus-within:bg-search-active focus-within:shadow-[var(--search-active-shadow)] md:flex">
      <Search aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
      <span className="sr-only">{t("globalSearch")}</span>
      <input
        className="min-w-0 flex-1 bg-transparent text-ui text-foreground outline-none placeholder:text-muted-foreground"
        placeholder={t("searchPlaceholder")}
        type="search"
      />
    </label>
  )
}

type HeaderProfileIndicatorProps = {
  avatarUrl?: string | null
  className?: string
  initials?: string
}

const HeaderProfileIndicator = forwardRef<HTMLButtonElement, HeaderProfileIndicatorProps & ComponentProps<"button">>(function HeaderProfileIndicator(
  { avatarUrl = null, className, initials = "U", ...props },
  ref,
) {
  const t = useTranslations("common.header")
  return (
    <button
      aria-label={t("openProfileMenu")}
      className={cn("motion-interactive flex h-[2.375rem] cursor-pointer items-center gap-1.5 rounded-[13px] py-0.5 pr-1 pl-0.5 outline-none hover:bg-muted focus-visible:bg-muted", className)}
      ref={ref}
      type="button"
      {...props}
    >
      <AppUserAvatar avatarUrl={avatarUrl} className="size-[2.125rem] text-ui" initials={initials} />
      <ChevronDown aria-hidden="true" className="size-3.5 text-content-secondary" />
    </button>
  )
})

HeaderProfileIndicator.displayName = "HeaderProfileIndicator"

export { HeaderApp, HeaderProfileIndicator }
