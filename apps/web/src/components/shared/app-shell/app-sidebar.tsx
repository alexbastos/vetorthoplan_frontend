"use client"

import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

import { homeNavigationItem, primaryNavigationItems, supportNavigationItems } from "./app-navigation"
import { useAppTheme } from "./app-theme-provider"
import { useUnsavedChangesGuard } from "./unsaved-changes-guard"
import type { AppNavigationItem, AppSidebarProps, AppSidebarState } from "./types"

function AppSidebar({ mode = "desktop", onDismiss, onNavigate, onStateChange, state = "expanded" }: AppSidebarProps) {
  const t = useTranslations("common.navigation")
  const { resolvedTheme } = useAppTheme()
  const isMobile = mode === "mobile"
  const isCollapsed = state === "collapsed"
  const nextState: AppSidebarState = isCollapsed ? "expanded" : "collapsed"

  return (
    <aside
      aria-label={t("main")}
      className={cn(
        "h-dvh shrink-0 flex-col bg-capta-surface-sidebar",
        "motion-panel",
        isMobile
          ? "flex w-[var(--layout-sidebar-width-expanded)] shadow-[var(--shadow-stage)]"
          : "hidden lg:flex",
        isCollapsed && !isMobile ? "w-[var(--layout-sidebar-width-collapsed)]" : "w-[var(--layout-sidebar-width-expanded)]",
      )}
    >
      <header className="flex h-[var(--layout-header-height)] shrink-0 items-center px-6">
        {!isCollapsed ? (
          <Image alt="CAPTAGOV" className="-ml-2 mr-auto h-7 w-auto" height={28} src={resolvedTheme === "dark" ? "/brand/logo_white.svg" : "/brand/logo_black.svg"} width={112} />
        ) : null}
        <button
          aria-label={isMobile ? t("close") : isCollapsed ? t("expand") : t("collapse")}
          className={cn(
            "motion-interactive flex size-8 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-capta-text-secondary outline-none",
            "hover:bg-capta-surface-subtle hover:text-capta-text-primary",
            "focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-capta-surface-raised",
            "disabled:pointer-events-none disabled:opacity-50",
            isCollapsed && "mx-auto",
          )}
          disabled={isMobile ? !onDismiss : !onStateChange}
          onClick={() => {
            if (isMobile) {
              onDismiss?.()
              return
            }

            onStateChange?.(nextState)
          }}
          type="button"
        >
          {isMobile ? <X aria-hidden="true" className="size-[1.125rem]" /> : isCollapsed ? <PanelLeftOpen aria-hidden="true" className="size-[1.125rem]" /> : <PanelLeftClose aria-hidden="true" className="size-[1.125rem]" />}
        </button>
      </header>

      <nav className="flex min-h-0 flex-1 flex-col px-3 pb-2" aria-label={t("routes")}>
        <NavigationItem item={homeNavigationItem} onNavigate={onNavigate} state={state} />
        {primaryNavigationItems.length > 0 ? (
          <>
            <div aria-hidden="true" className="mx-3 my-3 h-px bg-capta-surface-default" />
            <div className="space-y-1">
              {primaryNavigationItems.map((item) => (
                <NavigationItem key={item.href} item={item} onNavigate={onNavigate} state={state} />
              ))}
            </div>
          </>
        ) : null}
        <div className="mt-auto space-y-1 pt-4">
          {supportNavigationItems.map((item) => (
            <NavigationItem key={item.href} item={item} onNavigate={onNavigate} state={state} />
          ))}
        </div>
      </nav>
    </aside>
  )
}

type NavigationItemProps = {
  item: AppNavigationItem
  onNavigate?: () => void
  state: AppSidebarState
}

function NavigationItem({ item, onNavigate, state }: NavigationItemProps) {
  const t = useTranslations("common.navigation")
  const pathname = usePathname()
  const router = useRouter()
  const { requestNavigation } = useUnsavedChangesGuard()
  const isHome = item.href === "/app"
  const isActive = isHome ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
  const Icon = item.icon
  const isCollapsed = state === "collapsed"
  const label = t(item.translationKey)

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      aria-label={isCollapsed ? label : undefined}
      className={cn(
        "motion-interactive group flex h-[2.625rem] items-center rounded-[0.6875rem] text-capta-text-primary outline-none",
        "hover:bg-capta-surface-hover focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-capta-surface-raised",
        isActive && "bg-capta-surface-default",
        isCollapsed ? "justify-center" : "gap-3 px-3",
      )}
      href={item.href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return
        }

        if (item.href === pathname) {
          onNavigate?.()
          return
        }

        event.preventDefault()
        requestNavigation(() => {
          onNavigate?.()
          router.push(item.href)
        })
      }}
      title={isCollapsed ? label : undefined}
    >
      <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
      {!isCollapsed ? <span className="text-ui font-medium">{label}</span> : null}
    </Link>
  )
}

export { AppSidebar }
