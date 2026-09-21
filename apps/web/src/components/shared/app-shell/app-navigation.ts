import { CircleHelp, House, Settings } from "lucide-react"

import type { AppNavigationItem } from "./types"

const homeNavigationItem: AppNavigationItem = {
  href: "/app",
  icon: House,
  translationKey: "home",
}

/**
 * Funcionalidades em preparação permanecem fora da navegação do MVP.
 * As respectivas rotas podem ser retomadas quando os fluxos estiverem prontos.
 */
const primaryNavigationItems: AppNavigationItem[] = []

const supportNavigationItems: AppNavigationItem[] = [
  { href: "/app/settings", icon: Settings, translationKey: "settings" },
  { href: "/app/ajuda", icon: CircleHelp, translationKey: "help" },
]

function getAppRouteContext(pathname: string): "application" | AppNavigationItem["translationKey"] {
  if (pathname === homeNavigationItem.href) {
    return homeNavigationItem.translationKey
  }

  const navigationItem = [...primaryNavigationItems, ...supportNavigationItems].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )

  return navigationItem?.translationKey ?? "application"
}

export { getAppRouteContext, homeNavigationItem, primaryNavigationItems, supportNavigationItems }
