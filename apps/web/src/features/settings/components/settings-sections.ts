import type { ComponentType, SVGProps } from "react"

import {
  AddressSettingsIcon,
  DevicesSettingsIcon,
  ProfileSettingsIcon,
  SecuritySettingsIcon,
} from "./settings-navigation-icons"

type SettingsNavigationGroup = "access" | "account"
type SettingsSection = "address" | "devices" | "profile" | "security"

type SettingsSectionDefinition = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  id: SettingsSection
}

type SettingsNavigationGroupDefinition = {
  id: SettingsNavigationGroup
  sections: readonly SettingsSectionDefinition[]
}

const settingsNavigationGroups: readonly SettingsNavigationGroupDefinition[] = [
  {
    id: "account",
    sections: [
      { icon: ProfileSettingsIcon, id: "profile" },
      { icon: AddressSettingsIcon, id: "address" },
    ],
  },
  {
    id: "access",
    sections: [
      { icon: SecuritySettingsIcon, id: "security" },
      { icon: DevicesSettingsIcon, id: "devices" },
    ],
  },
]

const settingsSections: readonly SettingsSectionDefinition[] = settingsNavigationGroups.flatMap((group) => group.sections)

function isSettingsSection(value: string): value is SettingsSection {
  return settingsSections.some((section) => section.id === value)
}

export { isSettingsSection, settingsNavigationGroups, settingsSections }
export type { SettingsSection }
