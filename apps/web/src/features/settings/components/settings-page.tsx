"use client"

import { ShieldCheck, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useRef, useState, type KeyboardEvent, type RefObject } from "react"

import { useUnsavedChangesGuard } from "@/components/shared/app-shell/unsaved-changes-guard"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useProfileSettings } from "../hooks/use-profile-settings"

import { PreferencesSettingsPanel } from "./preferences/preferences-settings-panel"
import { ProfileSettingsPanel } from "./profile/profile-settings-panel"
import { ConnectedDevicesPanel } from "./security/connected-devices-panel"
import { PasswordSettingsPanel } from "./security/password-settings-panel"
import { TwoFactorAuthenticationPanel } from "./security/two-factor-authentication/two-factor-authentication-panel"
import { SettingsPageMotion } from "./settings-page-motion"

type SettingsSection = "preferences" | "profile" | "security"

const settingsSections: Array<{ icon: LucideIcon; id: SettingsSection }> = [
  { icon: UserRound, id: "profile" },
  { icon: ShieldCheck, id: "security" },
  { icon: SlidersHorizontal, id: "preferences" },
]

function SettingsPage() {
  const t = useTranslations("settings")
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile")
  const { requestNavigation } = useUnsavedChangesGuard()
  const profileSettings = useProfileSettings()
  const tabListId = useId()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  function selectSection(section: SettingsSection) {
    if (section === activeSection) return true
    return requestNavigation(() => setActiveSection(section))
  }

  function moveTabFocus(currentIndex: number, event: KeyboardEvent<HTMLButtonElement>) {
    const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0
    if (!direction) return

    event.preventDefault()
    const nextIndex = (currentIndex + direction + settingsSections.length) % settingsSections.length
    if (selectSection(settingsSections[nextIndex].id)) tabRefs.current[nextIndex]?.focus()
  }

  return (
    <SettingsPageMotion>
      <header data-settings-page-header className="max-w-2xl space-y-1">
        <h1 className="font-heading text-[1.375rem] leading-[1.3] font-semibold tracking-[-0.02em] text-capta-text-primary">{t("title")}</h1>
        <p className="text-ui text-capta-text-secondary">{t("description")}</p>
      </header>

      <div className="mt-8 flex min-h-0 flex-col gap-6 md:mt-10 md:flex-row md:gap-8">
        <SettingsNavigation activeSection={activeSection} onKeyDown={moveTabFocus} onSelect={selectSection} tabListId={tabListId} tabRefs={tabRefs} />

        <Card data-settings-page-content className="min-h-72 flex-1 !gap-0 !p-0 md:self-start">
          {settingsSections.map((section) => (
            <section aria-labelledby={`${tabListId}-${section.id}-tab`} hidden={section.id !== activeSection} id={`${tabListId}-${section.id}-panel`} key={section.id} role="tabpanel">
              <div className="px-6 py-6 sm:px-8">
                <h2 className="font-heading text-[1.125rem] leading-[1.3] font-semibold tracking-[-0.02em] text-capta-text-primary">{t(`sections.${section.id}.label`)}</h2>
                <p className="mt-1 max-w-xl text-ui text-capta-text-secondary">{t(`sections.${section.id}.description`)}</p>
              </div>

              {section.id === "profile" ? <ProfileSettingsPanel isActive={section.id === activeSection} profileSettings={profileSettings} /> : null}
              {section.id === "preferences" ? <PreferencesSettingsPanel isActive={section.id === activeSection} profileSettings={profileSettings} /> : null}
              {section.id === "security" ? <>
                <PasswordSettingsPanel isActive={section.id === activeSection} />
                <TwoFactorAuthenticationPanel isActive={section.id === activeSection} />
                <ConnectedDevicesPanel isActive={section.id === activeSection} />
              </> : null}
            </section>
          ))}
        </Card>
      </div>
    </SettingsPageMotion>
  )
}

type SettingsNavigationProps = {
  activeSection: SettingsSection
  onKeyDown: (currentIndex: number, event: KeyboardEvent<HTMLButtonElement>) => void
  onSelect: (section: SettingsSection) => boolean
  tabListId: string
  tabRefs: RefObject<Array<HTMLButtonElement | null>>
}

function SettingsNavigation({ activeSection, onKeyDown, onSelect, tabListId, tabRefs }: SettingsNavigationProps) {
  const t = useTranslations("settings")

  return (
    <nav aria-label={t("navigationLabel")} data-settings-navigation className="-mx-6 overflow-x-auto px-6 pb-1 sm:-mx-8 sm:px-8 md:mx-0 md:w-52 md:shrink-0 md:self-start md:overflow-visible md:p-0">
      <div className="flex min-w-max gap-2 md:flex-col" role="tablist">
        {settingsSections.map((section, index) => {
          const Icon = section.icon
          const isActive = section.id === activeSection

          return (
            <button
              aria-controls={`${tabListId}-${section.id}-panel`}
              aria-selected={isActive}
              className={cn("motion-interactive flex h-10 cursor-pointer items-center gap-3 rounded-[var(--radius-token-lg)] px-3 text-left text-[0.8125rem] leading-[var(--type-ui-line-height)] font-normal text-capta-text-secondary outline-none", "hover:bg-capta-surface-subtle hover:text-capta-text-primary focus-visible:ring-2 focus-visible:ring-capta-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-capta-surface-card", "md:w-full", isActive && "bg-capta-surface-default text-capta-text-primary")}
              id={`${tabListId}-${section.id}-tab`}
              key={section.id}
              onClick={() => onSelect(section.id)}
              onKeyDown={(event) => onKeyDown(index, event)}
              ref={(element) => { tabRefs.current[index] = element }}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {t(`sections.${section.id}.label`)}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export { SettingsPage }
