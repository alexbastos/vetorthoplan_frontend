"use client"

import { useTranslations } from "next-intl"

import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { isSettingsSection, settingsNavigationGroups, type SettingsSection } from "./settings-sections"

type SettingsNavigationProps = {
  activeSection: SettingsSection
  navigationId: string
  onSelect: (section: SettingsSection) => boolean
}

function SettingsNavigation({ activeSection, navigationId, onSelect }: SettingsNavigationProps) {
  const t = useTranslations("settings")

  return (
    <div className="md:self-start" data-settings-navigation>
      <div className="md:hidden">
        <label className="mb-2 block text-caption font-medium text-muted-foreground" htmlFor={`${navigationId}-mobile-trigger`}>
          {t("mobileNavigationLabel")}
        </label>
        <Select
          onValueChange={(value) => {
            if (isSettingsSection(value)) onSelect(value)
          }}
          value={activeSection}
        >
          <SelectTrigger aria-controls={`${navigationId}-${activeSection}-panel`} id={`${navigationId}-mobile-trigger`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {settingsNavigationGroups.map((group) => (
              <SelectGroup key={group.id}>
                <SelectLabel className="font-data normal-case text-[#a3a3a3]">{t(`navigationGroups.${group.id}`)}</SelectLabel>
                {group.sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>{t(`sections.${section.id}.label`)}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label={t("navigationLabel")} className="hidden md:block">
        <Card className="w-60 !gap-0 !p-4 shadow-none">
          {settingsNavigationGroups.map((group, groupIndex) => (
            <div className={cn(groupIndex > 0 && "mt-3 border-t border-border pt-3")} key={group.id}>
              <p className="px-5 py-1 font-data text-[0.6875rem] leading-4 font-medium tracking-[0.04em] text-[#a3a3a3]">
                {t(`navigationGroups.${group.id}`)}
              </p>
              <ul className="mt-1 space-y-1">
                {group.sections.map((section) => {
                  const Icon = section.icon
                  const isActive = section.id === activeSection

                  return (
                    <li
                      className={cn(
                        "relative pl-2",
                        isActive && "before:absolute before:top-2.5 before:bottom-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--case-editor-radio-active)]",
                      )}
                      key={section.id}
                    >
                      <button
                        aria-controls={`${navigationId}-${section.id}-panel`}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "motion-interactive flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-[var(--radius-token-md)] px-3 py-2 text-left text-[0.8125rem] leading-[var(--type-ui-line-height)] font-normal text-tab-label outline-none",
                          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                          isActive && "bg-hover text-foreground",
                        )}
                        onClick={() => onSelect(section.id)}
                        type="button"
                      >
                        <Icon aria-hidden="true" className={cn("size-5 shrink-0 text-icon-muted", isActive && "text-icon-active")} />
                        <span>{t(`sections.${section.id}.label`)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </Card>
      </nav>
    </div>
  )
}

export { SettingsNavigation }
