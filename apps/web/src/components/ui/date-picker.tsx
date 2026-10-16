"use client"

import { format } from "date-fns"
import { ChevronDown } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Popover } from "radix-ui"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { getDateFnsLocale } from "@/i18n/date-fns-locale"

import { Calendar } from "./calendar"

type DatePickerProps = {
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  ariaLabel?: string
  className?: string
  disabled?: boolean
  id: string
  onValueChange: (value: string) => void
  placeholder?: string
  value: string
}

function DatePicker({ "aria-describedby": ariaDescribedBy, "aria-invalid": ariaInvalid, ariaLabel, className, disabled = false, id, onValueChange, placeholder, value }: DatePickerProps) {
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
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel ?? t("selectDate")}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-between gap-3 bg-transparent text-left font-sans text-[length:var(--type-ui-size)] leading-[var(--type-ui-line-height)] outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selectedDate ? "font-medium text-foreground" : "text-[length:var(--input-placeholder-size)] font-normal text-[var(--input-placeholder)]",
            className,
          )}
          disabled={disabled}
          id={id}
          type="button"
        >
          <span className="truncate">{selectedDate ? format(selectedDate, "P", { locale: dateLocale }) : (placeholder ?? t("placeholder"))}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-50 rounded-[var(--radius-token-lg)] border border-border bg-card shadow-[var(--shadow-elevated)] outline-none"
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
