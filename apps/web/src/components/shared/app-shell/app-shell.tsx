"use client"

import { Menu } from "lucide-react"
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { getAppRouteContext } from "./app-navigation"
import { AppStage } from "./app-stage"
import { AppSidebar } from "./app-sidebar"
import { AppUserProvider, getUserInitials } from "./app-user-context"
import { HeaderApp } from "./header-app"
import { AppProfileMenu } from "./app-profile-menu"
import { AppThemeProvider } from "./app-theme-provider"
import { UnsavedChangesGuard } from "./unsaved-changes-guard"
import type { AppSidebarState } from "./types"

const SIDEBAR_PREFERENCE_KEY = "captagov:app-sidebar-state"
const SIDEBAR_PREFERENCE_EVENT = "captagov:app-sidebar-preference"

type AppShellProps = {
  children: ReactNode
  userName: string
}

/**
 * Estrutura visual da área autenticada. Dados de domínio e ações específicas
 * de rota continuam pertencendo às respectivas features.
 */
function AppShell({ children, userName }: AppShellProps) {
  const pathname = usePathname()
  const t = useTranslations("common.navigation")
  const context = t(getAppRouteContext(pathname))
  const [sidebarState, setSidebarState] = useSidebarPreference()
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)

  useEffect(() => {
    if (!mobileNavigationOpen) {
      return
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavigationOpen(false)
      }
    }

    window.addEventListener("keydown", closeOnEscape)

    return () => {
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [mobileNavigationOpen])

  return (
    <AppUserProvider name={userName}>
      <AppThemeProvider>
        <UnsavedChangesGuard>
          <div className="flex h-dvh overflow-hidden bg-capta-surface-default">
            <AppSidebar onStateChange={setSidebarState} state={sidebarState} />

            {mobileNavigationOpen ? (
              <div className="fixed inset-0 z-50 lg:hidden">
                <button
                  aria-label={t("close")}
                  className="absolute inset-0 bg-black/20"
                  onClick={() => setMobileNavigationOpen(false)}
                  type="button"
                />
                <div id="app-mobile-navigation" className="relative h-full w-fit">
                  <AppSidebar mode="mobile" onDismiss={() => setMobileNavigationOpen(false)} onNavigate={() => setMobileNavigationOpen(false)} />
                </div>
              </div>
            ) : null}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-capta-surface-workspace">
              <HeaderApp
                context={context}
                navigation={
                  <button
                    aria-controls="app-mobile-navigation"
                    aria-expanded={mobileNavigationOpen}
                    aria-label={t("open")}
                    className="motion-interactive flex size-9 items-center justify-center rounded-[var(--radius-token-md)] text-capta-text-secondary outline-none hover:bg-capta-surface-subtle hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-capta-surface-raised"
                    onClick={() => setMobileNavigationOpen(true)}
                    type="button"
                  >
                    <Menu aria-hidden="true" className="size-[1.125rem]" />
                  </button>
                }
                profile={<AppProfileMenu initials={getUserInitials(userName)} />}
              />
              <AppStage className="flex flex-col overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {children}
              </AppStage>
            </div>
          </div>
        </UnsavedChangesGuard>
      </AppThemeProvider>
    </AppUserProvider>
  )
}

function useSidebarPreference(): [AppSidebarState, (state: AppSidebarState) => void] {
  const state = useSyncExternalStore(subscribeToSidebarPreference, readSidebarPreference, getServerSidebarPreference)

  function updatePreference(nextState: AppSidebarState) {
    window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, nextState)
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT))
  }

  return [state, updatePreference]
}

function subscribeToSidebarPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(SIDEBAR_PREFERENCE_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(SIDEBAR_PREFERENCE_EVENT, onStoreChange)
  }
}

function readSidebarPreference(): AppSidebarState {
  const savedPreference = window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY)

  return savedPreference === "collapsed" || savedPreference === "expanded" ? savedPreference : "expanded"
}

function getServerSidebarPreference(): AppSidebarState {
  return "expanded"
}

export { AppShell }
export type { AppShellProps }
