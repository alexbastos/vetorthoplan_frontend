import type { AppNavigationItem } from "./types"
import { CasesNavigationIcon, HelpNavigationIcon, HomeNavigationIcon, SettingsNavigationIcon } from "./app-navigation-icons"

const homeNavigationItem: AppNavigationItem = {
  href: "/app",
  icon: HomeNavigationIcon,
  translationKey: "home",
}

/**
 * Funcionalidades em preparação permanecem fora da navegação do MVP.
 * As respectivas rotas podem ser retomadas quando os fluxos estiverem prontos.
 */
const primaryNavigationItems: AppNavigationItem[] = [
  { href: "/app/cases", icon: CasesNavigationIcon, translationKey: "cases" },
]

const settingsNavigationItem: AppNavigationItem = {
  href: "/app/settings",
  icon: SettingsNavigationIcon,
  translationKey: "settings",
}

const supportNavigationItems: AppNavigationItem[] = [
  settingsNavigationItem,
  { href: "/app/ajuda", icon: HelpNavigationIcon, translationKey: "help" },
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

export { getAppRouteContext, homeNavigationItem, primaryNavigationItems, settingsNavigationItem, supportNavigationItems }
