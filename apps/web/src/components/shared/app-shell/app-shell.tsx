"use client"

import { Menu } from "lucide-react"
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import { getAppRouteContext } from "./app-navigation"
import { AppStage } from "./app-stage"
import { AppSidebar } from "./app-sidebar"
import { AppUserProvider } from "./app-user-context"
import { HeaderApp } from "./header-app"
import { AppProfileMenu } from "./app-profile-menu"
import { AppThemeProvider } from "./app-theme-provider"
import { UnsavedChangesGuard } from "./unsaved-changes-guard"
import type { AppSidebarState } from "./types"
import { useLoginHandoffDestinationAnimation } from "../login-handoff/use-login-handoff-destination-animation"

const SIDEBAR_PREFERENCE_KEY = "vetorthoplan:app-sidebar-state"
const SIDEBAR_PREFERENCE_EVENT = "vetorthoplan:app-sidebar-preference"
const FOCUSED_APP_ROUTES = new Set(["/app/cases/new"])
const CASE_WORKSPACE_ROUTE = /^\/app\/cases\/[^/]+\/plan$/

type AppShellProps = {
  children: ReactNode
  userAvatarUrl: string | null
  userName: string
}

/**
 * Estrutura visual da área autenticada. Dados de domínio e ações específicas
 * de rota continuam pertencendo às respectivas features.
 */
function AppShell({ children, userAvatarUrl, userName }: AppShellProps) {
  const pathname = usePathname()
  const t = useTranslations("common.navigation")
  const context = t(getAppRouteContext(pathname))
  const isFocusedRoute = FOCUSED_APP_ROUTES.has(pathname) || CASE_WORKSPACE_ROUTE.test(pathname)
  const [sidebarState, setSidebarState] = useSidebarPreference()
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const destinationRef = useRef<HTMLDivElement>(null)

  useLoginHandoffDestinationAnimation(destinationRef)

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
    <AppUserProvider avatarUrl={userAvatarUrl} name={userName}>
      <AppThemeProvider>
        <UnsavedChangesGuard>
          {isFocusedRoute ? (
            <div ref={destinationRef} className="h-dvh overflow-y-auto bg-workspace" data-focused-app-route>
              {children}
            </div>
          ) : (
            <div ref={destinationRef} className="flex h-dvh overflow-hidden bg-background" data-app-shell>
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

              <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-workspace">
                <HeaderApp
                  context={context}
                  navigation={
                    <button
                      aria-controls="app-mobile-navigation"
                      aria-expanded={mobileNavigationOpen}
                      aria-label={t("open")}
                      className="motion-interactive flex size-9 items-center justify-center rounded-[var(--radius-token-md)] text-content-secondary outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-raised"
                      onClick={() => setMobileNavigationOpen(true)}
                      type="button"
                    >
                      <Menu aria-hidden="true" className="size-[1.125rem]" />
                    </button>
                  }
                  profile={<AppProfileMenu />}
                />
                <AppStage className="flex flex-col overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {children}
                </AppStage>
              </div>
            </div>
          )}
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
