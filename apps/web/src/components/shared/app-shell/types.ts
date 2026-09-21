import type { ComponentType, ReactNode, SVGProps } from "react"

type AppSidebarState = "collapsed" | "expanded"

type AppNavigationItem = {
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  translationKey: "help" | "home" | "settings"
}

type HeaderAppProps = {
  actions?: ReactNode
  context: string
  navigation?: ReactNode
  notifications?: ReactNode
  profile?: ReactNode
}

type AppSidebarProps = {
  mode?: "desktop" | "mobile"
  onDismiss?: () => void
  onNavigate?: () => void
  onStateChange?: (state: AppSidebarState) => void
  state?: AppSidebarState
}

export type { AppNavigationItem, AppSidebarProps, AppSidebarState, HeaderAppProps }
