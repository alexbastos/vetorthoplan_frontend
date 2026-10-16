"use client"

import { format } from "date-fns"
import { useLocale, useTranslations } from "next-intl"
import { Popover } from "radix-ui"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { getDateFnsLocale } from "@/i18n/date-fns-locale"

import { Calendar } from "./calendar"

type DatePickerProps = {
  disabled?: boolean
  id: string
  onValueChange: (value: string) => void
  placeholder?: string
  value: string
}

function DatePicker({ disabled = false, id, onValueChange, placeholder, value }: DatePickerProps) {
  const locale = useLocale()
  const t = useTranslations("common.datePicker")
  const dateLocale = getDateFnsLocale(locale)
  const [open, setOpen] = useState(false)
  const selectedDate = parseDateOnly(value)
  const today = new Date()

  return (
    <Popover.Root onOpenChange={setOpen} open={open}>
      <Popover.Trigger asChild>
        <button
          aria-label={t("selectDate")}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-between gap-3 bg-transparent text-left font-sans text-[length:var(--type-ui-size)] leading-[var(--type-ui-line-height)] outline-none focus-visible:ring-2 focus-visible:ring-capta-brand-primary",
            selectedDate ? "font-semibold text-capta-text-primary" : "font-normal text-capta-text-muted",
          )}
          disabled={disabled}
          id={id}
          type="button"
        >
          <span>{selectedDate ? format(selectedDate, "P", { locale: dateLocale }) : (placeholder ?? t("placeholder"))}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-50 rounded-[var(--radius-token-lg)] border border-capta-border-default bg-capta-surface-card shadow-lg outline-none"
          sideOffset={8}
        >
          <Calendar
            captionLayout="dropdown"
            disabled={{ after: today }}
            endMonth={today}
            locale={dateLocale}
            mode="single"
            onSelect={(date) => {
              onValueChange(date ? formatDateOnly(date) : "")
              setOpen(false)
            }}
            selected={selectedDate}
            startMonth={new Date(1900, 0)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function parseDateOnly(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return undefined
  }

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
    ? date
    : undefined
}

export { DatePicker }
