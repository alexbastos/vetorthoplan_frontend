"use client"

import { MapPin } from "lucide-react"
import { useTranslations } from "next-intl"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"

const timeZoneGroups = [
  { id: "americas", options: [{ id: "americaSaoPaulo", value: "America/Sao_Paulo" }, { id: "americaManaus", value: "America/Manaus" }, { id: "americaBogota", value: "America/Bogota" }, { id: "americaNewYork", value: "America/New_York" }, { id: "americaChicago", value: "America/Chicago" }, { id: "americaDenver", value: "America/Denver" }, { id: "americaLosAngeles", value: "America/Los_Angeles" }] },
  { id: "europe", options: [{ id: "europeLondon", value: "Europe/London" }, { id: "europeLisbon", value: "Europe/Lisbon" }] },
  { id: "global", options: [{ id: "utc", value: "UTC" }] },
] as const

const supportedTimeZones = new Set<string>(timeZoneGroups.flatMap((group) => group.options.map((option) => option.value)))

type TimeZoneSelectFieldProps = { error?: string; onValueChange: (value: string) => void; value: string }

function TimeZoneSelectField({ error, onValueChange, value }: TimeZoneSelectFieldProps) {
  const t = useTranslations("settings.preferences")
  const inputId = "profile-timezone"
  const errorId = `${inputId}-error`
  const hasCustomTimeZone = Boolean(value) && !supportedTimeZones.has(value)

  return (
    <div>
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-capta-border-default bg-capta-surface-subtle text-capta-text-secondary"><MapPin className="size-3.5" strokeWidth={1.75} /></span>
        <div className="min-w-0">
          <label className="text-caption font-semibold text-capta-text-primary" htmlFor={inputId}>{t("timezone")}</label>
          <p className="mt-1 text-caption text-capta-text-secondary">{t("timezoneHint")}</p>
        </div>
      </div>
      <div className="mt-3">
        <Select onValueChange={onValueChange} value={value}>
          <SelectTrigger aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)} className="h-9 text-caption" id={inputId}><SelectValue placeholder={t("timezonePlaceholder")} /></SelectTrigger>
          <SelectContent align="start">
            {hasCustomTimeZone ? <SelectItem value={value}>{value}</SelectItem> : null}
            {timeZoneGroups.map((group) => (
              <SelectGroup key={group.id}>
                <SelectLabel>{t(`timezoneGroups.${group.id}`)}</SelectLabel>
                {group.options.map((option) => <SelectItem key={option.value} value={option.value}>{t(`timezones.${option.id}`)}</SelectItem>)}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="mt-2 text-caption text-[var(--color-feedback-error)]" id={errorId} role="alert">{error}</p> : null}
    </div>
  )
}

export { TimeZoneSelectField }
