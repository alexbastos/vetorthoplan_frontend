import {
  CasesNavigationIcon,
  CommunityNavigationIcon,
  DocumentFileSidebarIcon,
  MeasurementsSidebarIcon,
  PlatformDeviceIcon,
  SimulationSidebarIcon,
} from "../landing-platform-icons"

const routineBenefits = [
  { id: "efficiency", icon: CasesNavigationIcon },
  { id: "flexibility", icon: PlatformDeviceIcon },
  { id: "references", icon: MeasurementsSidebarIcon },
  { id: "planning", icon: SimulationSidebarIcon },
  { id: "documentation", icon: DocumentFileSidebarIcon },
  { id: "collaboration", icon: CommunityNavigationIcon },
] as const

export { routineBenefits }
