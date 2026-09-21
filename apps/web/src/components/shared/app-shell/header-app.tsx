"use client"

import { BellDot, ChevronDown, Search } from "lucide-react"
import { forwardRef, type ComponentProps } from "react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

import type { HeaderAppProps } from "./types"

function HeaderApp({ actions, context, navigation, notifications, profile }: HeaderAppProps) {
  const t = useTranslations("common.header")
  return (
    <header className="flex h-[var(--layout-header-height)] items-center justify-between gap-3 bg-capta-surface-sidebar px-4 sm:gap-6 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {navigation ? <span className="shrink-0 lg:hidden">{navigation}</span> : null}
        <p className="min-w-0 truncate font-mono text-[0.8125rem] font-medium tracking-[0.06em] text-capta-text-primary">
          <span aria-hidden="true" className="mr-2 text-capta-text-muted">/</span>
          {context.toUpperCase()}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <GlobalSearch />
        <div id="app-header-actions" aria-label={t("pageActions")} className="hidden items-center gap-2 empty:hidden sm:flex">
          {actions}
        </div>
        {notifications ?? <HeaderNotificationIndicator />}
        {profile ?? <HeaderProfileIndicator />}
      </div>
    </header>
  )
}

function GlobalSearch() {
  const t = useTranslations("common.header")
  return (
    <label className="hidden h-9 w-60 items-center gap-2 rounded-full bg-capta-surface-subtle px-3.5 md:flex">
      <Search aria-hidden="true" className="size-3 shrink-0 text-capta-text-muted" />
      <span className="sr-only">{t("globalSearch")}</span>
      <input
        className="min-w-0 flex-1 bg-transparent text-ui text-capta-text-primary outline-none placeholder:text-capta-text-muted"
        placeholder={t("searchPlaceholder")}
        type="search"
      />
    </label>
  )
}

function HeaderNotificationIndicator() {
  const t = useTranslations("common.header")
  return (
    <span aria-label={t("notifications")} className="flex size-9 items-center justify-center rounded-[var(--radius-token-md)] text-capta-text-secondary">
      <BellDot aria-hidden="true" className="size-[1.125rem]" />
    </span>
  )
}

type HeaderProfileIndicatorProps = {
  className?: string
  initials?: string
}

const HeaderProfileIndicator = forwardRef<HTMLButtonElement, HeaderProfileIndicatorProps & ComponentProps<"button">>(function HeaderProfileIndicator(
  { className, initials = "U", ...props },
  ref,
) {
  const t = useTranslations("common.header")
  return (
    <button
      aria-label={t("openProfileMenu")}
      className={cn("motion-interactive flex h-[2.375rem] cursor-pointer items-center gap-1.5 rounded-full py-0.5 pr-1 pl-0.5 outline-none hover:bg-capta-surface-subtle focus-visible:bg-capta-surface-subtle", className)}
      ref={ref}
      type="button"
      {...props}
    >
      <span className="flex size-[2.125rem] items-center justify-center rounded-full bg-capta-brand-secondary text-ui font-bold text-capta-text-inverse">
        {initials.slice(0, 2).toUpperCase()}
      </span>
      <ChevronDown aria-hidden="true" className="size-3.5 text-capta-text-secondary" />
    </button>
  )
})

HeaderProfileIndicator.displayName = "HeaderProfileIndicator"

export { HeaderApp, HeaderProfileIndicator }
