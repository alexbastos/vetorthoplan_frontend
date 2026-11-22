import type { ComponentProps, ComponentType } from "react"

type PlatformIconProps = ComponentProps<"svg">
type LandingPlatformIcon = ComponentType<PlatformIconProps>

// Use the product's own native SVGs. New glyphs share the sidebar's 24-unit
// viewBox, 20px footprint, currentColor, 1.5px stroke and rounded line endings.
export { CasesNavigationIcon, CommunityNavigationIcon } from "@/components/shared/app-shell/app-navigation-icons"
export { DocumentFileSidebarIcon, MeasurementsSidebarIcon, SimulationSidebarIcon } from "./hero/marketing-sidebar-icons"

function PlatformGlyph({ children, ...props }: PlatformIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" color="currentColor" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  )
}

function PlatformDeviceIcon(props: PlatformIconProps) {
  return (
    <PlatformGlyph {...props}>
      <path d="M8 3.5H16C18.5927 3.5 19.8891 3.5 20.6945 4.30546C21.5 5.11091 21.5 6.40727 21.5 9V11.5C21.5 14.0927 21.5 15.3891 20.6945 16.1945C19.8891 17 18.5927 17 16 17H8C5.40727 17 4.11091 17 3.30546 16.1945C2.5 15.3891 2.5 14.0927 2.5 11.5V9C2.5 6.40727 2.5 5.11091 3.30546 4.30546C4.11091 3.5 5.40727 3.5 8 3.5Z" />
      <path d="M2.5 13H21.5M12 17V21M8.5 21H15.5" />
    </PlatformGlyph>
  )
}

function PlatformReviewIcon(props: PlatformIconProps) {
  return (
    <PlatformGlyph {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M7.5 12L10.5 15L16.5 9" />
    </PlatformGlyph>
  )
}

function PlatformHistoryIcon(props: PlatformIconProps) {
  return (
    <PlatformGlyph {...props}>
      <path d="M3.5 9C4.7 5.5 8 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.6 21 3.9 17.8 3.15 13.5M3.5 4.5V9H8" />
      <path d="M12 7.5V12L15 14" />
    </PlatformGlyph>
  )
}

export { PlatformDeviceIcon, PlatformReviewIcon, PlatformHistoryIcon }
export type { LandingPlatformIcon }
