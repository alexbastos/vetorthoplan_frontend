import type { ComponentProps } from "react"

type SidebarIconProps = ComponentProps<"svg">

function SidebarGlyph({ children, ...props }: SidebarIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" color="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" {...props}>
      {children}
    </svg>
  )
}

function ImagesSidebarIcon(props: SidebarIconProps) {
  return (
    <SidebarGlyph {...props}>
      <rect x="6" y="3" width="15" height="15" rx="2.5" />
      <path d="M3 7v11.5A2.5 2.5 0 0 0 5.5 21H17" />
      <circle cx="11" cy="8.5" r="1" />
      <path d="m8 15 3.2-3.2 2.2 2.2 1.8-1.8 2.5 2.5" />
    </SidebarGlyph>
  )
}

function CalibrationSidebarIcon(props: SidebarIconProps) {
  return (
    <SidebarGlyph {...props}>
      <path d="M8 3.5H6A2.5 2.5 0 0 0 3.5 6v2M16 3.5h2A2.5 2.5 0 0 1 20.5 6v2M20.5 16v2a2.5 2.5 0 0 1-2.5 2.5h-2M8 20.5H6A2.5 2.5 0 0 1 3.5 18v-2" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 6.5v2M12 15.5v2M6.5 12h2M15.5 12h2" />
    </SidebarGlyph>
  )
}

function MeasurementsSidebarIcon(props: SidebarIconProps) {
  return (
    <SidebarGlyph {...props}>
      <path d="m4.5 7.5 3-3a2 2 0 0 1 2.8 0l9.2 9.2a2 2 0 0 1 0 2.8l-3 3a2 2 0 0 1-2.8 0l-9.2-9.2a2 2 0 0 1 0-2.8Z" />
      <path d="m9 9 2.2-2.2M12 12l2.2-2.2M15 15l2.2-2.2" />
    </SidebarGlyph>
  )
}

function SimulationSidebarIcon(props: SidebarIconProps) {
  return (
    <SidebarGlyph {...props}>
      <path d="M12 3.5v17M3.5 12h17" />
      <path d="m9 6.5 3-3 3 3M9 17.5l3 3 3-3M6.5 9l-3 3 3 3M17.5 9l3 3-3 3" />
    </SidebarGlyph>
  )
}

function AddFileSidebarIcon(props: SidebarIconProps) {
  return (
    <SidebarGlyph {...props}>
      <path d="M12 4.5v15M4.5 12h15" />
    </SidebarGlyph>
  )
}

function FileOutline() {
  return (
    <>
      <path d="M13.5 3.5h-7A2.5 2.5 0 0 0 4 6v12a2.5 2.5 0 0 0 2.5 2.5H15a2.5 2.5 0 0 0 2.5-2.5V7.5l-4-4Z" />
      <path d="M13.5 3.5v4h4" />
    </>
  )
}

function DocumentFileSidebarIcon(props: SidebarIconProps) {
  return (
    <SidebarGlyph {...props}>
      <FileOutline />
      <path d="M8 11h6M8 14h6M8 17h4" />
    </SidebarGlyph>
  )
}

function SidebarCheckIcon(props: SidebarIconProps) {
  return (
    <SidebarGlyph {...props}>
      <path d="m4.5 12 5 5 10-10" />
    </SidebarGlyph>
  )
}

function SidebarChevronIcon(props: SidebarIconProps) {
  return (
    <SidebarGlyph {...props}>
      <path d="m7 10 5 5 5-5" />
    </SidebarGlyph>
  )
}

export {
  AddFileSidebarIcon,
  CalibrationSidebarIcon,
  DocumentFileSidebarIcon,
  ImagesSidebarIcon,
  MeasurementsSidebarIcon,
  SidebarCheckIcon,
  SidebarChevronIcon,
  SimulationSidebarIcon,
}
