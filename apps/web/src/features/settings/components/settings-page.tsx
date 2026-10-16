"use client"

import { useTranslations } from "next-intl"
import { useId, useState } from "react"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { Card } from "@/components/ui/card"
import { useProfileSettings } from "../hooks/use-profile-settings"

import { ProfileSettingsPanel } from "./profile/profile-settings-panel"
import { ConnectedDevicesPanel } from "./security/connected-devices-panel"
import { PasswordSettingsPanel } from "./security/password-settings-panel"
import { TwoFactorAuthenticationPanel } from "./security/two-factor-authentication/two-factor-authentication-panel"
import { SettingsNavigation } from "./settings-navigation"
import { SettingsPageMotion } from "./settings-page-motion"
import { settingsSections, type SettingsSection } from "./settings-sections"

function SettingsPage() {
  const t = useTranslations("settings")
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile")
  const { requestNavigation } = useUnsavedChangesGuard()
  const profileSettings = useProfileSettings()
  const navigationId = useId()

  function selectSection(section: SettingsSection) {
    if (section === activeSection) return true
    return requestNavigation(() => setActiveSection(section))
  }

  return (
    <SettingsPageMotion>
      <header data-settings-page-header className="max-w-2xl space-y-1">
        <h1 className="font-heading text-[1.375rem] leading-[1.3] font-semibold tracking-[-0.02em] text-foreground">{t("title")}</h1>
        <p className="text-ui text-description">{t("description")}</p>
      </header>

      <div className="mt-8 grid min-h-0 gap-6 md:mt-10 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8">
        <SettingsNavigation activeSection={activeSection} navigationId={navigationId} onSelect={selectSection} />

        <Card data-settings-page-content className="flex-1 !gap-0 !p-0 md:self-start">
          {settingsSections.map((section) => (
            <section
              aria-label={t(`sections.${section.id}.label`)}
              hidden={section.id !== activeSection}
              id={`${navigationId}-${section.id}-panel`}
              key={section.id}
            >
              {section.id === "profile" ? <ProfileSettingsPanel isActive={section.id === activeSection} profileSettings={profileSettings} scope="personal" /> : null}
              {section.id === "address" ? <ProfileSettingsPanel isActive={section.id === activeSection} profileSettings={profileSettings} scope="address" /> : null}
              {section.id === "security" ? <>
                <PasswordSettingsPanel isActive={section.id === activeSection} />
                <TwoFactorAuthenticationPanel isActive={section.id === activeSection} />
              </> : null}
              {section.id === "devices" ? <ConnectedDevicesPanel isActive={section.id === activeSection} /> : null}
            </section>
          ))}
        </Card>
      </div>
    </SettingsPageMotion>
  )
}

export { SettingsPage }
