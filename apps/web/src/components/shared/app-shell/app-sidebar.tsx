"use client"

import { X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { AppVersion } from "@/components/shared/app-version"

import { homeNavigationItem, primaryNavigationItems, settingsNavigationItem } from "./app-navigation"
import { HelpNavigationIcon } from "./app-navigation-icons"
import { useAppTheme } from "./app-theme-provider"
import { useUnsavedChangesGuard } from "./unsaved-changes-guard"
import type { AppNavigationItem, AppSidebarProps, AppSidebarState } from "./types"

function AppSidebar({ mode = "desktop", onDismiss, onNavigate, onStateChange, state = "expanded" }: AppSidebarProps) {
  const t = useTranslations("common.navigation")
  const { resolvedTheme } = useAppTheme()
  const isDarkTheme = resolvedTheme === "dark"
  const isMobile = mode === "mobile"
  const isCollapsed = state === "collapsed"
  const nextState: AppSidebarState = isCollapsed ? "expanded" : "collapsed"

  return (
    <aside
      aria-label={t("main")}
      className={cn(
        "h-dvh shrink-0 flex-col bg-sidebar",
        "motion-panel",
        isMobile
          ? "flex w-[var(--layout-sidebar-width-expanded)] shadow-[var(--shadow-stage)]"
          : "hidden lg:flex",
        isCollapsed && !isMobile ? "w-[var(--layout-sidebar-width-collapsed)]" : "w-[var(--layout-sidebar-width-expanded)]",
      )}
    >
      <header className="flex h-[var(--layout-header-height)] shrink-0 items-center px-6">
        {!isCollapsed ? (
          <Image
            alt="Orthovet"
            className="-ml-px mr-auto h-auto w-24 object-contain object-left"
            height={19}
            priority
            src={isDarkTheme ? "/brand/logo_vet_v2_white_spaced.svg" : "/brand/logo_vet_v2_black_spaced.svg"}
            width={96}
          />
        ) : null}
        <button
          aria-label={isMobile ? t("close") : isCollapsed ? t("expand") : t("collapse")}
          className={cn(
            "motion-interactive flex size-8 cursor-pointer items-center justify-center rounded-[var(--radius-token-md)] text-content-secondary outline-none",
            "hover:bg-muted hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-raised",
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
          {isMobile ? <X aria-hidden="true" className="size-[1.125rem]" /> : <SidebarPanelIcon />}
        </button>
      </header>

      <nav className="-mt-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-2" aria-label={t("routes")}>
        <NavigationItem item={homeNavigationItem} onNavigate={onNavigate} state={state} />
        {primaryNavigationItems.map((item) => (
          <NavigationItem key={item.href} item={item} onNavigate={onNavigate} state={state} />
        ))}
      </nav>
      <div className="shrink-0">
        {!isCollapsed ? <WhatsNewCard /> : null}
        <SidebarFooter onNavigate={onNavigate} state={state} />
      </div>
    </aside>
  )
}

function WhatsNewCard() {
  const t = useTranslations("common.whatsNew")

  return (
    <div className="mx-3 mb-3 overflow-hidden rounded-[var(--radius-token-xl)] border border-border bg-card text-card-foreground">
      <div className="relative aspect-[2043/770] overflow-hidden bg-muted">
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="232px"
          src="/images/home/img_card_whats_new.avif"
        />
        <span className="absolute bottom-2.5 left-3 rounded-full bg-card/90 px-2.5 py-1 text-[0.6875rem] font-medium leading-none text-card-foreground backdrop-blur-sm">
          {t("eyebrow")}
        </span>
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <p className="text-ui font-medium leading-snug">{t("title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-content-secondary">{t("description")}</p>
      </div>
    </div>
  )
}

function SidebarFooter({ onNavigate, state }: { onNavigate?: () => void; state: AppSidebarState }) {
  const t = useTranslations("common.sidebarFooter")
  const tStatus = useTranslations("common.status")
  const isCollapsed = state === "collapsed"

  return (
    <div className="mx-3 mb-4 text-foreground">
      <NavigationItem item={settingsNavigationItem} onNavigate={onNavigate} state={state} />
      <button
        aria-label={isCollapsed ? t("helpCenter") : undefined}
        className={cn(
          "motion-interactive flex h-[2.625rem] w-full cursor-pointer items-center rounded-[0.6875rem] text-left text-ui font-medium outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-raised",
          isCollapsed ? "justify-center" : "gap-3 px-3",
        )}
        onClick={() => toast.info(tStatus("comingSoon"), { description: tStatus("comingSoonDescription") })}
        title={isCollapsed ? t("helpCenter") : undefined}
        type="button"
      >
        <HelpNavigationIcon aria-hidden="true" className="size-5 shrink-0 text-sidebar-icon" />
        {!isCollapsed ? <span>{t("helpCenter")}</span> : null}
      </button>
      {!isCollapsed ? <p className="mt-2 px-3 text-xs text-content-secondary"><AppVersion /></p> : null}
    </div>
  )
}

function SidebarPanelIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12C2.5 7.52166 2.5 5.28248 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M9 21.5V2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
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
        "motion-interactive group flex h-[2.625rem] items-center rounded-[0.6875rem] text-foreground outline-none",
        "hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-raised",
        isActive && "bg-hover",
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
      <Icon aria-hidden="true" className={cn("size-5 shrink-0 text-sidebar-icon", isActive && "text-sidebar-icon-active")} />
      {!isCollapsed ? <span className="text-ui font-medium">{label}</span> : null}
    </Link>
  )
}

export { AppSidebar }
